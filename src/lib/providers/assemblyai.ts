import type { TranscriptionResult } from "../transcription";

/** Fetch with a per-request AbortController timeout. */
async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error(`AssemblyAI request timed out after ${timeoutMs / 1000}s`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export async function transcribeWithAssemblyAI(
  wavBuffer: Uint8Array,
  _model: string,
  apiKey: string,
  language: string = "auto"
): Promise<TranscriptionResult> {
  if (!apiKey) throw new Error("AssemblyAI API key not set");

  // Step 1: Upload audio file (15s timeout)
  const uploadResponse = await fetchWithTimeout(
    "https://api.assemblyai.com/v2/upload",
    {
      method: "POST",
      headers: {
        Authorization: apiKey,
        "Content-Type": "application/octet-stream",
      },
      body: wavBuffer,
    },
    15_000
  );

  if (!uploadResponse.ok) {
    throw new Error(`AssemblyAI upload failed (${uploadResponse.status})`);
  }
  const { upload_url } = await uploadResponse.json();

  // Step 2: Request transcription (10s timeout)
  const body: Record<string, unknown> = { audio_url: upload_url };
  if (language === "auto") {
    body.language_detection = true;
  } else {
    body.language_code = language;
  }

  const transcriptResponse = await fetchWithTimeout(
    "https://api.assemblyai.com/v2/transcript",
    {
      method: "POST",
      headers: {
        Authorization: apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
    10_000
  );

  if (!transcriptResponse.ok) {
    throw new Error(`AssemblyAI transcript request failed (${transcriptResponse.status})`);
  }
  const { id } = await transcriptResponse.json();

  // Step 3: Poll with exponential backoff (max ~45s total)
  let delay = 1000; // start at 1s
  const maxDelay = 4000;
  const deadline = Date.now() + 45_000;

  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, delay));
    const poll = await fetchWithTimeout(
      `https://api.assemblyai.com/v2/transcript/${id}`,
      { headers: { Authorization: apiKey } },
      10_000
    );
    const result = await poll.json();

    if (result.status === "completed") {
      return {
        text: result.text ?? "",
        noSpeechProb: result.text?.trim() === "" ? 0.9 : 0,
      };
    }
    if (result.status === "error") {
      throw new Error("AssemblyAI transcription failed");
    }

    // Exponential backoff: 1s → 2s → 4s → 4s → 4s...
    delay = Math.min(delay * 2, maxDelay);
  }

  throw new Error("AssemblyAI transcription timed out");
}
