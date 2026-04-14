import { transcribeWithGroq } from "./providers/groq";
import { transcribeWithDeepgram } from "./providers/deepgram";
import { transcribeWithAssemblyAI } from "./providers/assemblyai";
import { transcribeWithGemini } from "./providers/gemini";

export interface TranscriptionResult {
  text: string;
  noSpeechProb: number;
}

export interface ProviderModel {
  id: string;
  name: string;
}

export interface Provider {
  id: string;
  name: string;
  models: ProviderModel[];
  defaultModel: string;
}

export const PROVIDERS: Provider[] = [
  {
    id: "groq",
    name: "Groq",
    defaultModel: "whisper-large-v3",
    models: [
      { id: "whisper-large-v3-turbo", name: "Whisper Large v3 Turbo" },
      { id: "whisper-large-v3", name: "Whisper Large v3" },
    ],
  },
  {
    id: "deepgram",
    name: "Deepgram",
    defaultModel: "nova-3",
    models: [
      { id: "nova-3", name: "Nova 3" },
      { id: "nova-2", name: "Nova 2" },
    ],
  },
  {
    id: "assemblyai",
    name: "AssemblyAI",
    defaultModel: "universal",
    models: [
      { id: "universal", name: "Universal" },
    ],
  },
  {
    id: "gemini",
    name: "Gemini",
    defaultModel: "gemini-2.0-flash",
    models: [
      { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash" },
      { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash" },
      { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro" },
    ],
  },
];

// Whisper hallucinates these phrases on silence or low-quality audio
const HALLUCINATION_PATTERNS: RegExp[] = [
  /^(thank(s| you)[\.\!\,]?\s*)+$/i,
  /^(you[\.\!]?\s*)+$/i,
  /^(bye[\.\!]?\s*)+$/i,
  /please (like|subscribe|follow)/i,
  /see you (in the next|next time)/i,
  /^\[.*\]$/, // e.g. [silence], [music], [BLANK_AUDIO]
  /^\(.*\)$/, // e.g. (silence)
  /^\.+$/, // only dots
  /^(subtitles? by|subtitled by|captioned by)/i,
  /^(www\.|http)/i, // hallucinated URLs
  /transcript(ion)? (by|provided|made)/i,
  /^(i love you\.?\s*)+$/i,
  /^(\.\s*)+$/, // repeated periods
];

function isHallucination(text: string): boolean {
  const t = text.trim();
  if (!t) return true;
  return HALLUCINATION_PATTERNS.some((p) => p.test(t));
}

// Calculate RMS energy of 16-bit PCM WAV (standard 44-byte header)
function wavRms(wavBuffer: Uint8Array): number {
  if (wavBuffer.length < 46) return 0;
  const view = new DataView(wavBuffer.buffer, wavBuffer.byteOffset);
  const sampleCount = Math.floor((wavBuffer.length - 44) / 2);
  if (sampleCount === 0) return 0;
  let sumSq = 0;
  for (let i = 0; i < sampleCount; i++) {
    const s = view.getInt16(44 + i * 2, true) / 32768;
    sumSq += s * s;
  }
  return Math.sqrt(sumSq / sampleCount);
}

const SILENCE: TranscriptionResult = { text: "", noSpeechProb: 1.0 };

export async function transcribeAudio(
  wavBuffer: Uint8Array,
  providerId: string,
  model: string,
  apiKey: string,
  language: string = "auto"
): Promise<TranscriptionResult> {
  // Skip API call entirely if audio is truly silent
  const rms = wavRms(wavBuffer);
  if (rms < 0.0005) return SILENCE;

  let result: TranscriptionResult;
  switch (providerId) {
    case "groq":
      result = await transcribeWithGroq(wavBuffer, model, apiKey, language);
      break;
    case "deepgram":
      result = await transcribeWithDeepgram(wavBuffer, model, apiKey, language);
      break;
    case "assemblyai":
      result = await transcribeWithAssemblyAI(wavBuffer, model, apiKey, language);
      break;
    case "gemini":
      result = await transcribeWithGemini(wavBuffer, model, apiKey, language);
      break;
    default:
      throw new Error(`Unknown transcription provider: ${providerId}`);
  }

  // Discard known Whisper hallucinations
  if (isHallucination(result.text)) return SILENCE;

  return result;
}
