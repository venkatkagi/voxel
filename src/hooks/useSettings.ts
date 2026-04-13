import { load } from "@tauri-apps/plugin-store";
import { useAppStore, ToneMode } from "@/store/useAppStore";
import { enable, disable, isEnabled } from "@tauri-apps/plugin-autostart";

const STORE_FILE = "settings.json";

interface PersistedSettings {
  hotkey?: string;
  toneMode?: ToneMode;
  autostartEnabled?: boolean;
  historyEnabled?: boolean;
  enableLiveTranscription?: boolean;
  polishEnabled?: boolean;
  transcriptionProvider?: string;
  transcriptionModel?: string;
  polishProvider?: string;
  polishModel?: string;
  microphoneDevice?: string | null;
  language?: string;
  providerApiKeys?: Record<string, string>;
  hasSeenWelcome?: boolean;
}

export async function loadSettings(): Promise<void> {
  const store = await load(STORE_FILE);

  const hotkey = await store.get<string>("hotkey");
  const toneMode = await store.get<ToneMode>("toneMode");
  const autostartEnabled = await store.get<boolean>("autostartEnabled");
  const historyEnabled = await store.get<boolean>("historyEnabled");
  const enableLiveTranscription = await store.get<boolean>("enableLiveTranscription");
  const polishEnabled = await store.get<boolean>("polishEnabled");
  const transcriptionProvider = await store.get<string>("transcriptionProvider");
  const transcriptionModel = await store.get<string>("transcriptionModel");
  const polishProvider = await store.get<string>("polishProvider");
  const polishModel = await store.get<string>("polishModel");
  const microphoneDevice = await store.get<string | null>("microphoneDevice");
  const language = await store.get<string>("language");
  const providerApiKeys = await store.get<Record<string, string>>("providerApiKeys");
  const hasSeenWelcome = await store.get<boolean>("hasSeenWelcome");

  const { setState } = useAppStore;
  setState((prev) => ({
    hotkey: hotkey ?? prev.hotkey,
    toneMode: toneMode ?? prev.toneMode,
    autostartEnabled: autostartEnabled ?? prev.autostartEnabled,
    historyEnabled: historyEnabled ?? prev.historyEnabled,
    enableLiveTranscription: enableLiveTranscription ?? prev.enableLiveTranscription,
    polishEnabled: polishEnabled ?? prev.polishEnabled,
    transcriptionProvider: transcriptionProvider ?? prev.transcriptionProvider,
    transcriptionModel: transcriptionModel ?? prev.transcriptionModel,
    polishProvider: polishProvider ?? prev.polishProvider,
    polishModel: polishModel ?? prev.polishModel,
    microphoneDevice: microphoneDevice === undefined ? prev.microphoneDevice : microphoneDevice,
    language: language ?? prev.language,
    providerApiKeys: providerApiKeys ?? prev.providerApiKeys,
    hasSeenWelcome: hasSeenWelcome ?? prev.hasSeenWelcome,
  }));
}

export async function persistSettings(patch: Partial<PersistedSettings>): Promise<void> {
  const store = await load(STORE_FILE);
  for (const [key, value] of Object.entries(patch)) {
    await store.set(key, value);
  }
  await store.save();
}

export async function setAutostart(enabled: boolean): Promise<void> {
  if (enabled) {
    await enable();
  } else {
    await disable();
  }
}

export async function getAutostartStatus(): Promise<boolean> {
  return isEnabled();
}
