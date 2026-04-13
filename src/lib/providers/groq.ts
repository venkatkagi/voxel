import type { TranscriptionResult } from "../transcription";

export async function transcribeWithGroq(
  wavBuffer: Uint8Array,
  model: string,
  apiKey: string,
  language: string = "auto"
): Promise<TranscriptionResult> {
  if (!apiKey) throw new Error("Groq API key not set");

  // .slice(0) copies into a plain ArrayBuffer — required because Tauri-provided
  // Uint8Arrays have an ArrayBufferLike backing that Blob rejects under strict TS.
  const blob = new Blob([wavBuffer.slice(0)], { type: "audio/wav" });
  const form = new FormData();
  form.append("file", blob, "audio.wav");
  form.append("model", model);
  if (language !== "auto") {
    form.append("language", language);
  }
  form.append("response_format", "verbose_json");
  form.append("temperature", "0");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  let response: Response;
  try {
    response = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeout);
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error("Groq transcription timed out after 30s");
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new Error(`Groq transcription failed (${response.status})`);
  }

  const data = await response.json();
  // Use duration-weighted average rather than max. Math.max caused brief pauses (which
  // score high no_speech_prob on their own) to discard entire valid recordings.
  const segments: { no_speech_prob?: number; start?: number; end?: number }[] = data.segments ?? [];
  let noSpeechProb = 0;
  if (segments.length > 0) {
    let totalDuration = 0;
    let weightedSum = 0;
    for (const seg of segments) {
      const dur = (seg.end ?? 0) - (seg.start ?? 0);
      const weight = dur > 0 ? dur : 1;
      weightedSum += (seg.no_speech_prob ?? 0) * weight;
      totalDuration += weight;
    }
    noSpeechProb = weightedSum / totalDuration;
  }
  return { text: data.text ?? "", noSpeechProb };
}
