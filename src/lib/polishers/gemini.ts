import type { ToneMode } from "../../store/useAppStore";



const SYSTEM_PROMPT = (tone: ToneMode) =>
  `You are a high-fidelity transcript polisher. Your goal is to keep the user's speech EXACTLY as spoken (verbatim), but clean up common voice-to-text errors.
  
  RULES:
  - DO NOT fix grammar or reorganize sentences. If the user spoke incorrectly, keep it that way.
  - ONLY fix obvious mis-transcribed words (e.g. "git hub" -> "GitHub", "vs code" -> "VS Code").
  - Remove pure vocal fillers ("um", "uh", "hmm").
  - Punctuate naturally based on the flow of speech.
  - Preserve the user's original language and slang.
  - Tone setting (${tone}): Influence only the punctuation and capitalization style (e.g. Formal = more standard punctuation, Casual = lighter).
  
  CRITICAL: 
  - If you are unsure about a word, DO NOT CHANGE IT.
  - Output ONLY the polished text. No tags, no markdown.`;

export async function polishWithGemini(
  rawText: string,
  tone: ToneMode,
  model: string,
  apiKey: string
): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);

  try {
    // Note: Gemini requires API key in URL — this is Google's API design.
    // The key is more exposed than header-based auth (visible in logs/proxies).
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SYSTEM_PROMPT(tone) }] },
          contents: [{ parts: [{ text: rawText }] }],
          generationConfig: { temperature: 0.1 },
        }),
        signal: controller.signal,
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini polish failed (${response.status})`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? rawText;
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error("Gemini polish timed out after 20s");
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}
