import type { TranscriptionResult } from "../transcription";

export async function transcribeWithDeepgram(
  wavBuffer: Uint8Array,
  model: string,
  apiKey: string,
  language: string = "auto"
): Promise<TranscriptionResult> {
  if (!apiKey) throw new Error("Deepgram API key not set");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  const langParam = language === "auto" ? "detect_language=true" : `language=${language}`;
  let response: Response;
  try {
    response = await fetch(
      `https://api.deepgram.com/v1/listen?model=${model}&${langParam}&punctuate=true`,
      {
        method: "POST",
        headers: {
          Authorization: `Token ${apiKey}`,
          "Content-Type": "audio/wav",
        },
        body: wavBuffer,
        signal: controller.signal,
      }
    );
  } catch (err) {
    clearTimeout(timeout);
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error("Deepgram transcription timed out after 30s");
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new Error(`Deepgram transcription failed (${response.status})`);
  }

  const data = await response.json();
  const alternative = data.results?.channels?.[0]?.alternatives?.[0];
  const text = alternative?.transcript ?? "";
  const confidence = alternative?.confidence ?? 1;

  return {
    text,
    // Deepgram has no no_speech_prob — treat empty transcript or very low confidence as silence
    noSpeechProb: text.trim() === "" ? 0.9 : 1 - confidence,
  };
}
