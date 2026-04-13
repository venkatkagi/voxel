import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import { emit } from "@tauri-apps/api/event";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { PROVIDERS } from "../lib/transcription";
import { POLISH_PROVIDERS } from "../lib/polish";

export type RecordingState = "idle" | "recording" | "processing" | "polishing" | "done" | "error";
export type ToneMode = "professional" | "casual" | "formal";

export interface TranscriptEntry {
  id: number;
  raw: string;
  polished: string;
  tone: ToneMode;
  timestamp: number;
}

interface AppStore {
  isRecording: boolean;
  recordingState: RecordingState;
  audioBuffer: Uint8Array | null;
  rawTranscript: string;
  polishedTranscript: string;

  // Pseudo-streaming State
  stableText: string;
  draftText: string;

  // Settings
  hotkey: string;
  toneMode: ToneMode;
  autostartEnabled: boolean;
  historyEnabled: boolean;
  enableLiveTranscription: boolean;
  microphoneDevice: string | null;
  language: string;

  // Transcription provider selection
  transcriptionProvider: string;
  transcriptionModel: string;
  providerApiKeys: Record<string, string>;

  // Polish provider selection
  polishEnabled: boolean;
  polishProvider: string;
  polishModel: string;

  // History
  history: TranscriptEntry[];
  hasSeenWelcome: boolean;

  // Actions
  setHasSeenWelcome: (val: boolean) => void;
  setRecordingState: (state: RecordingState) => void;
  setAudioBuffer: (buffer: Uint8Array | null) => void;
  setRawTranscript: (text: string) => void;
  setPolishedTranscript: (text: string) => void;
  setStableText: (text: string) => void;
  setDraftText: (text: string) => void;
  setToneMode: (mode: ToneMode) => void;
  setHotkey: (hotkey: string) => void;
  setAutostartEnabled: (enabled: boolean) => void;
  setHistoryEnabled: (enabled: boolean) => void;
  setLiveTranscriptionEnabled: (enabled: boolean) => void;
  setMicrophoneDevice: (device: string | null) => void;
  setLanguage: (lang: string) => void;
  setTranscriptionProvider: (provider: string, model?: string) => void;
  setTranscriptionModel: (model: string) => void;
  setProviderApiKey: (provider: string, key: string) => void;
  setPolishEnabled: (enabled: boolean) => void;
  setPolishProvider: (provider: string, model?: string) => void;
  setPolishModel: (model: string) => void;
  addToHistory: (entry: TranscriptEntry) => void;
  setHistory: (history: TranscriptEntry[]) => void;
  saveTranscript: (raw: string, polished: string, tone: ToneMode) => Promise<void>;
  loadHistory: () => Promise<void>;
  startDictation: () => Promise<void>;
  stopDictation: () => Promise<void>;
}

function emitRecordingState(state: RecordingState) {
  emit("recording-state-changed", state).catch(console.error);
}

function emitLiveTranscription(stableText: string, draftText: string) {
  emit("live-transcription-changed", { stableText, draftText }).catch(console.error);
}

let trackingInterval: ReturnType<typeof setInterval> | null = null;
let idleTimeout: ReturnType<typeof setTimeout> | null = null;
let isProcessingChunk = false;
let currentWindowSeconds = 3.0;

export const useAppStore = create<AppStore>((set, get) => ({
  isRecording: false,
  recordingState: "idle",
  audioBuffer: null,
  rawTranscript: "",
  polishedTranscript: "",
  stableText: "",
  draftText: "",
  hotkey: "Ctrl+Shift+Space",
  toneMode: "professional",
  autostartEnabled: false,
  historyEnabled: true,
  enableLiveTranscription: false,
  microphoneDevice: null,
  language: "auto",
  transcriptionProvider: "groq",
  transcriptionModel: "whisper-large-v3-turbo",
  providerApiKeys: {},
  polishEnabled: false,
  polishProvider: "groq",
  polishModel: "llama-3.3-70b-versatile",
  history: [],
  hasSeenWelcome: false,

  setHasSeenWelcome: (hasSeenWelcome) => set({ hasSeenWelcome }),

  setRecordingState: (recordingState) =>
    set({ recordingState, isRecording: recordingState === "recording" }),
  setAudioBuffer: (audioBuffer) => set({ audioBuffer }),
  setRawTranscript: (rawTranscript) => set({ rawTranscript }),
  setPolishedTranscript: (polishedTranscript) => set({ polishedTranscript }),
  setStableText: (stableText) => {
    set({ stableText });
    emitLiveTranscription(stableText, get().draftText);
  },
  setDraftText: (draftText) => {
    set({ draftText });
    emitLiveTranscription(get().stableText, draftText);
  },
  setToneMode: (toneMode) => set({ toneMode }),
  setHotkey: (hotkey) => set({ hotkey }),
  setAutostartEnabled: (autostartEnabled) => set({ autostartEnabled }),
  setHistoryEnabled: (historyEnabled) => set({ historyEnabled }),
  setLiveTranscriptionEnabled: (enableLiveTranscription) => set({ enableLiveTranscription }),
  setMicrophoneDevice: (microphoneDevice) => set({ microphoneDevice }),
  setLanguage: (language) => set({ language }),

  setTranscriptionProvider: (provider, model) => {
    const found = PROVIDERS.find((p) => p.id === provider);
    set({
      transcriptionProvider: provider,
      transcriptionModel: model ?? found?.defaultModel ?? "",
    });
  },
  setTranscriptionModel: (transcriptionModel) => set({ transcriptionModel }),
  setProviderApiKey: (provider, key) =>
    set((state) => ({
      providerApiKeys: { ...state.providerApiKeys, [provider]: key },
    })),

  setPolishEnabled: (polishEnabled) => set({ polishEnabled }),

  setPolishProvider: (provider, model) => {
    const found = POLISH_PROVIDERS.find((p) => p.id === provider);
    set({
      polishProvider: provider,
      polishModel: model ?? found?.defaultModel ?? "",
    });
  },
  setPolishModel: (polishModel) => set({ polishModel }),

  addToHistory: (entry) =>
    set((state) => ({ history: [entry, ...state.history].slice(0, 100) })),

  setHistory: (history) => set({ history }),

  saveTranscript: async (raw, polished, tone) => {
    if (!get().historyEnabled) return;
    const { saveTranscript: dbSave } = await import("../lib/db");
    const timestamp = Date.now();
    await dbSave(raw, polished, tone, timestamp);
    await get().loadHistory();
  },

  loadHistory: async () => {
    const { loadHistory: dbLoad } = await import("../lib/db");
    const rows = await dbLoad(50);
    set({ history: rows });
  },

  startDictation: async () => {
    if (idleTimeout) clearTimeout(idleTimeout);
    
    const { transcriptionProvider, polishProvider, polishEnabled, providerApiKeys } = get();
    const transcribeKey = providerApiKeys[transcriptionProvider] ?? "";

    if (!transcribeKey) {
      emit("show-toast", { message: "Missing transcription API key.\nOpen Settings to add it.", type: "error" }).catch(console.error);
      invoke("open_settings").catch(console.error);
      return;
    }
    if (polishEnabled && !providerApiKeys[polishProvider]) {
      emit("show-toast", { message: "Missing AI polish API key.\nOpen Settings to add it.", type: "error" }).catch(console.error);
      invoke("open_settings").catch(console.error);
      return;
    }

    // Start recording FIRST — mic opens before any UI work
    set({ recordingState: "recording", isRecording: true, draftText: "", stableText: "" });
    emitLiveTranscription("", "");
    currentWindowSeconds = 3.0;
    isProcessingChunk = false;
    await invoke("start_recording");

    // Boot pseudo-streaming engine only if enabled
    if (get().enableLiveTranscription) {
      trackingInterval = setInterval(async () => {
        if (get().recordingState !== "recording") return;
        if (isProcessingChunk) {
          currentWindowSeconds = 4.0; // dynamic increase if API is laggy
          return;
        }
        isProcessingChunk = true;
        try {
          const bytes: any = await invoke("get_audio_chunk", { seconds: currentWindowSeconds });
          if (bytes && (bytes.length > 0 || bytes.byteLength > 0)) {
            // Read fresh from store each tick — key may have changed
            const { transcriptionProvider, transcriptionModel, language, providerApiKeys } = get();
            const liveApiKey = providerApiKeys[transcriptionProvider] ?? "";
            if (!liveApiKey) return;

            const { transcribeAudio } = await import("../lib/transcription");
            const result = await transcribeAudio(new Uint8Array(bytes), transcriptionProvider, transcriptionModel, liveApiKey, language);

            if (result.text && result.noSpeechProb < 0.9) {
              const prevDraft = get().draftText;
              const prevStable = get().stableText;

              // Stability heuristic: prevent violent regressions
              if (result.text.length >= prevDraft.length - 3 || result.text.length > prevStable.length) {
                set({ draftText: result.text });
                emitLiveTranscription(prevStable, result.text);
              }
            }
          }
        } catch (err) {
          currentWindowSeconds = 4.0;
        } finally {
          isProcessingChunk = false;
        }
      }, 2000); // 2000ms minimum interval to respect typical API limits
    }


    // Show pill + emit state concurrently (non-blocking for audio capture)
    emitRecordingState("recording");
    invoke("show_pill").catch(console.error);
  },

  stopDictation: async () => {
    if (trackingInterval) {
      clearInterval(trackingInterval);
      trackingInterval = null;
    }

    set({ recordingState: "processing" });
    emitRecordingState("processing");

    try {
      const wavBytes: number[] = await invoke("stop_recording");
      const wavBuffer = new Uint8Array(wavBytes);

      const { transcriptionProvider, transcriptionModel, providerApiKeys, toneMode, language } = get();
      const transcribeApiKey = providerApiKeys[transcriptionProvider] ?? "";

      const { transcribeAudio } = await import("../lib/transcription");
      const result = await transcribeAudio(wavBuffer, transcriptionProvider, transcriptionModel, transcribeApiKey, language);

      // 0.6 was too aggressive — valid recordings (especially short phrases or
      // accented speech) were silently discarded. Raised to 0.75 for a better balance.
      if (result.noSpeechProb > 0.75) {
        set({ recordingState: "idle", isRecording: false });
        emitRecordingState("idle");
        return;
      }

      const { polishEnabled, polishProvider, polishModel } = get();

      let polished: string;
      if (!polishEnabled) {
        polished = result.text;
      } else {
        set({ recordingState: "polishing" });
        emitRecordingState("polishing");

        const polishApiKey = providerApiKeys[polishProvider] ?? "";
        try {
          const { polishTranscript } = await import("../lib/polish");
          polished = await polishTranscript(
            result.text,
            toneMode,
            polishProvider as import("../lib/polish").PolishProvider,
            polishModel,
            polishApiKey
          );
        } catch (polishErr) {
          console.error("[polish]", polishErr);
          polished = result.text;
          emit("show-toast", { message: "AI polish failed — pasting raw transcript", type: "error" }).catch(console.error);
        }
      }

      set({ polishedTranscript: polished, stableText: polished, draftText: "" });
      emitLiveTranscription(polished, "");
      await writeText(polished);
      // Rust's simulate_paste already sleeps 300ms for focus restoration
      await invoke("simulate_paste");

      set({ recordingState: "done" });
      emitRecordingState("done");

      // Save to history after paste
      get().saveTranscript(result.text, polished, toneMode).catch(console.error);

      if (idleTimeout) clearTimeout(idleTimeout);
      idleTimeout = setTimeout(() => {
        set({ recordingState: "idle", isRecording: false });
        emitRecordingState("idle");
      }, 1500);
    } catch (err) {
      console.error("[dictation]", err);
      const msg = err instanceof Error ? err.message : String(err);
      emit("show-toast", { message: `Transcription failed: ${msg}`, type: "error" }).catch(console.error);
      set({ recordingState: "error", isRecording: false });
      emitRecordingState("error");
      setTimeout(() => {
        set({ recordingState: "idle" });
        emitRecordingState("idle");
      }, 3000);
    }
  },
}));
