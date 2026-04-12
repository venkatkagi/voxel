import type { ToneMode } from "../store/useAppStore";
import { polishWithAnthropic } from "./polishers/anthropic";
import { polishWithOpenAI } from "./polishers/openai";
import { polishWithGroqLLM } from "./polishers/groq-llm";
import { polishWithGemini } from "./polishers/gemini";

export type PolishProvider = "anthropic" | "openai" | "groq" | "gemini";

export const POLISH_PROVIDERS: {
  id: PolishProvider;
  label: string;
  defaultModel: string;
}[] = [
  { id: "groq", label: "Groq", defaultModel: "llama-3.3-70b-versatile" },
  { id: "anthropic", label: "Anthropic", defaultModel: "claude-haiku-4-5-20251001" },
  { id: "openai", label: "OpenAI", defaultModel: "gpt-4o-mini" },
  { id: "gemini", label: "Gemini", defaultModel: "gemini-2.0-flash" },
];

export async function polishTranscript(
  rawText: string,
  tone: ToneMode,
  provider: PolishProvider,
  model: string,
  apiKey: string
): Promise<string> {
  if (!rawText.trim()) return rawText;

  switch (provider) {
    case "anthropic":
      return polishWithAnthropic(rawText, tone, model, apiKey);
    case "openai":
      return polishWithOpenAI(rawText, tone, model, apiKey);
    case "groq":
      return polishWithGroqLLM(rawText, tone, model, apiKey);
    case "gemini":
      return polishWithGemini(rawText, tone, model, apiKey);
    default:
      return rawText;
  }
}
