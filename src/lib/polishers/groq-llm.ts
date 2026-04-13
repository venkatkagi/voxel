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

function userMessage(rawText: string): string {
  return rawText;
}

export async function polishWithGroqLLM(
  rawText: string,
  tone: ToneMode,
  model: string,
  apiKey: string
): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.1,
        messages: [
          { role: "system", content: SYSTEM_PROMPT(tone) },
          { role: "user", content: userMessage(rawText) },
        ],
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`Groq LLM polish failed (${res.status})`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? rawText;
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error("Groq polish timed out after 15s");
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}
