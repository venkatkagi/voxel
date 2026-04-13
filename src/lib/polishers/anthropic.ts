import type { ToneMode } from "../../store/useAppStore";



const SYSTEM_PROMPT = (tone: ToneMode) =>
  `You are a high-fidelity transcript polisher. Your goal is to keep the user's speech EXACTLY as spoken (verbatim), but clean up common voice-to-text or spelling errors.
  
  RULES:
  - DO NOT fix grammar or reorganize sentences. If the user spoke incorrectly, keep it that way.
  - ONLY fix obvious mis-transcribed words (e.g. "git hub" -> "GitHub", "vs code" -> "VS Code").
  - Remove pure vocal fillers ("um", "uh", "hmm").
  - Punctuate naturally based on the flow of speech.
  - Preserve the user's original language and slang.
  - Tone setting (${tone}): Influence only the punctuation and capitalization style.
  
  CRITICAL: 
  - If you are unsure about a word, DO NOT CHANGE IT.
  - Output ONLY the polished text. No tags, no markdown.`;

export async function polishWithAnthropic(
  rawText: string,
  tone: ToneMode,
  model: string,
  apiKey: string
): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: 1024,
        temperature: 0.1,
        system: SYSTEM_PROMPT(tone),
        messages: [{ role: "user", content: rawText }],
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`Anthropic polish failed (${res.status})`);
    }

    const data = await res.json();
    return data.content?.[0]?.text ?? rawText;
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error("Anthropic polish timed out after 20s");
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}
