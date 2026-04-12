import type { TranscriptionResult } from "../transcription";

export async function transcribeWithGemini(
  wavBuffer: Uint8Array,
  model: string,
  apiKey: string,
  language: string = "auto"
): Promise<TranscriptionResult> {
  if (!apiKey) throw new Error("Gemini API key not set");

  // Encode WAV as base64
  let binary = "";
  for (let i = 0; i < wavBuffer.length; i++) {
    binary += String.fromCharCode(wavBuffer[i]);
  }
  const base64Audio = btoa(binary);

  const langClause = language === "auto" ? "any language" : language;
  const prompt = `Transcribe the speech in this audio exactly as it is spoken in ${langClause}. 
  DO NOT summarize. DO NOT translate. DO NOT fix grammar or reorganize sentences. 
  Only return the transcribed text, nothing else. If there is no speech, return an empty string.`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  let response: Response;
  try {
    // Note: Gemini requires API key in URL — this is Google's API design.
    response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  inline_data: {
                    mime_type: "audio/wav",
                    data: base64Audio,
                  },
                },
                {
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: { temperature: 0 },
        }),
        signal: controller.signal,
      }
    );
  } catch (err) {
    clearTimeout(timeout);
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error("Gemini transcription timed out after 30s");
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new Error(`Gemini transcription failed (${response.status})`);
  }

  const data = await response.json();
  const text: string = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";

  return {
    text,
    noSpeechProb: text.length === 0 ? 1 : 0,
  };
}
