import type { ToneMode } from "../../store/useAppStore";



const SYSTEM_PROMPT = (tone: ToneMode) =>
  `You are a real-time speech-to-text polisher, exactly like Wispr Flow.
Transform raw dictated speech into clean, natural written text.

ALWAYS DO:
- Remove ALL filler words: um, uh, ah, hmm, like, you know, so, right, basically, I mean
- Handle self-corrections: if the user says "X, no actually Y" or "X, I mean Y", output only Y
- Fix grammar and sentence structure while preserving the user's vocabulary and style
- Add natural punctuation (periods, commas, question marks) based on speech rhythm
- Fix capitalization (start of sentences, proper nouns like GitHub, VS Code, API names)
- Fix obvious mis-transcriptions (e.g. "git hub" → "GitHub", "verse code" → "VS Code")

NEVER DO:
- Do not add information the user didn't say
- Do not summarize, shorten, or paraphrase ideas
- Do not change the user's word choices or vocabulary beyond corrections
- Do not output markdown, tags, or explanations — just the clean text

Tone (${tone}): Professional = formal punctuation and grammar. Casual = relaxed, contractions ok. Formal = proper, no contractions.

Output ONLY the polished text. Nothing else.`;

export async function polishWithOpenAI(
  rawText: string,
  tone: ToneMode,
  model: string,
  apiKey: string
): Promise<string> {
  const sanitizedKey = apiKey.trim().replace(/[^\x20-\x7E]/g, "");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${sanitizedKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.1,
        messages: [
          { role: "system", content: SYSTEM_PROMPT(tone) },
          { role: "user", content: rawText },
        ],
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`OpenAI polish failed (${res.status})`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? rawText;
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error("OpenAI polish timed out after 20s");
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}
