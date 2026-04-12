import type { TranscriptionResult } from "../transcription";

export async function transcribeWithAssemblyAI(
  wavBuffer: Uint8Array,
  _model: string,
  apiKey: string,
  language: string = "auto"
): Promise<TranscriptionResult> {
  if (!apiKey) throw new Error("AssemblyAI API key not set");

  // Step 1: Upload audio file
  const uploadResponse = await fetch("https://api.assemblyai.com/v2/upload", {
    method: "POST",
    headers: {
      Authorization: apiKey,
      "Content-Type": "application/octet-stream",
    },
    body: wavBuffer,
  });

  if (!uploadResponse.ok) {
    throw new Error(`AssemblyAI upload error ${uploadResponse.status}`);
  }
  const { upload_url } = await uploadResponse.json();

  // Step 2: Request transcription
  const body: any = { audio_url: upload_url };
  if (language === "auto") {
    body.language_detection = true;
  } else {
    body.language_code = language;
  }

  const transcriptResponse = await fetch("https://api.assemblyai.com/v2/transcript", {
    method: "POST",
    headers: {
      Authorization: apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!transcriptResponse.ok) {
    throw new Error(`AssemblyAI transcript error ${transcriptResponse.status}`);
  }
  const { id } = await transcriptResponse.json();

  // Step 3: Poll for completion (max 30s)
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    const poll = await fetch(`https://api.assemblyai.com/v2/transcript/${id}`, {
      headers: { Authorization: apiKey },
    });
    const result = await poll.json();
    if (result.status === "completed") {
      return {
        text: result.text ?? "",
        noSpeechProb: result.text?.trim() === "" ? 0.9 : 0,
      };
    }
    if (result.status === "error") {
      throw new Error(`AssemblyAI error: ${result.error}`);
    }
  }
  throw new Error("AssemblyAI transcription timed out after 30s");
}
