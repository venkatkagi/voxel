import React from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { CustomSelect } from "./ui/Select";
import { useAppStore, ToneMode } from "@/store/useAppStore";
import { persistSettings } from "@/hooks/useSettings";
import { enable as autostartEnable, disable as autostartDisable, isEnabled as autostartIsEnabled } from "@tauri-apps/plugin-autostart";
import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { RecordShortcutModal } from "./ShortcutRecorder";

const SPRING: [number, number, number, number] = [0.32, 0.72, 0, 1];

/* ─── Premium Toggle ─── */
function Toggle({ checked, onChange }: { checked: boolean; onChange: (c: boolean) => void }) {
  return (
    <label className="flex items-center cursor-pointer" aria-checked={checked} role="switch">
      <motion.div
        onClick={() => onChange(!checked)}
        animate={{
          backgroundColor: checked ? "oklch(0.62 0.07 25)" : "rgba(255,255,255,0.05)",
        }}
        transition={{ duration: 0.25, ease: SPRING }}
        className={`w-10 h-[22px] rounded-full relative border ${checked ? "border-transparent" : "border-white/[0.08]"}`}
      >
        <motion.div
          layout
          animate={{ x: checked ? 19 : 2 }}
          transition={{ type: "spring", stiffness: 500, damping: 32 }}
          className={`absolute top-[3px] w-4 h-4 rounded-full shadow-[0_1px_3px_rgba(0,0,0,0.5)] ${
            checked ? "bg-white" : "bg-zinc-500"
          }`}
        />
        <input type="checkbox" className="sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      </motion.div>
    </label>
  );
}

/* ─── Settings Row ─── */
function SettingsRow({ children, last = false }: { children: React.ReactNode; last?: boolean }) {
  return (
    <div className={`px-5 py-4 flex items-center justify-between gap-6 ${!last ? "border-b border-white/[0.04]" : ""}`}>
      {children}
    </div>
  );
}

/* ─── Row Label ─── */
function RowLabel({ title, description }: { title: string; description: string }) {
  return (
    <div className="min-w-0">
      <h3 className="font-semibold text-[13px] text-white/90 leading-tight">{title}</h3>
      <p className="text-white/35 text-[11px] mt-0.5 leading-snug font-medium">{description}</p>
    </div>
  );
}

export default function HomeSettings() {
  const {
    autostartEnabled,
    historyEnabled,
    toneMode,
    setHistoryEnabled,
    microphoneDevice,
    setMicrophoneDevice,
    enableLiveTranscription,
    setLiveTranscriptionEnabled,
    hotkey,
    setHotkey,
    language,
    setLanguage,
  } = useAppStore();

  const [mics, setMics] = useState<string[]>([]);
  const [showHotkeyModal, setShowHotkeyModal] = useState(false);

  useEffect(() => {
    invoke<string[]>("get_microphones").then(setMics).catch(console.error);
  }, []);

  // Sync real OS autostart state into the store on mount
  useEffect(() => {
    autostartIsEnabled()
      .then((osEnabled) => useAppStore.setState({ autostartEnabled: osEnabled }))
      .catch(() => {}); // silently ignore if plugin unavailable
  }, []);

  const handleAutostartChange = async (enabled: boolean) => {
    try {
      if (enabled) {
        await autostartEnable();
      } else {
        await autostartDisable();
      }
      useAppStore.setState({ autostartEnabled: enabled });
      persistSettings({ autostartEnabled: enabled }).catch(console.error);
    } catch (err) {
      console.error("[autostart]", err);
    }
  };
  const handleHistoryChange = (enabled: boolean) => {
    setHistoryEnabled(enabled);
    persistSettings({ historyEnabled: enabled }).catch(console.error);
  };
  const handleToneChange = (tone: ToneMode) => {
    useAppStore.setState({ toneMode: tone });
    persistSettings({ toneMode: tone }).catch(console.error);
  };
  const handleMicChange = (device: string) => {
    const val = device === "default" ? null : device;
    setMicrophoneDevice(val);
    persistSettings({ microphoneDevice: val }).catch(console.error);
  };
  const handleSaveHotkey = (newHotkey: string) => {
    setHotkey(newHotkey);
    persistSettings({ hotkey: newHotkey }).catch(console.error);
    setShowHotkeyModal(false);
  };
  const handleLanguageChange = (lang: string) => {
    setLanguage(lang);
    persistSettings({ language: lang }).catch(console.error);
  };

  return (
    <motion.div
      className="flex-1 overflow-y-auto bg-surface text-on-surface font-body p-6 md:p-10 ambient-bg"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.45, ease: SPRING }}
    >
      <div className="max-w-full mx-auto space-y-5">

        {/* Page header */}
        <div className="pt-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-white/[0.08] bg-white/[0.04] mb-3">
            <span className="text-[9px] uppercase tracking-[0.2em] font-bold text-white/40">Configuration</span>
          </div>
          <h1 className="text-2xl font-bold font-headline tracking-tighter text-on-surface/90">General Settings</h1>
        </div>

        {/* Settings card — Double-Bezel */}
        <div className="border border-on-surface/[0.04] rounded-[24px] bg-surface-container-low/50 overflow-hidden divide-y divide-on-surface/[0.04]">

            <SettingsRow>
              <RowLabel
                title="Open at Login"
                description="Automatically launch Voxel when you log in"
              />
              <Toggle checked={autostartEnabled ?? false} onChange={handleAutostartChange} />
            </SettingsRow>

            <SettingsRow>
              <RowLabel
                title="Dictation Hotkey"
                description="Shortcut to activate dictation from anywhere"
              />
              <div className="flex items-center gap-3 shrink-0">
                <div className="flex items-center gap-1.5 bg-surface-container px-3 py-1.5 rounded-xl border border-on-surface/[0.05] shadow-sm">
                  {hotkey.split("+").map((k, i, arr) => (
                    <div key={k} className="flex items-center gap-1">
                      <kbd className="bg-white/[0.08] border border-white/[0.12] px-2 py-0.5 rounded-md font-mono text-[10px] text-white/70 shadow-[inset_0_-1px_0_rgba(0,0,0,0.5)] tracking-tight">
                        {k}
                      </kbd>
                      {i < arr.length - 1 && <span className="text-white/20 text-[9px] font-bold">+</span>}
                    </div>
                  ))}
                  <button
                    onClick={() => setShowHotkeyModal(true)}
                    className="ml-1.5 p-1 hover:bg-white/10 rounded-lg text-white/30 hover:text-white/70 transition-all active:scale-90"
                    style={{ transitionTimingFunction: "cubic-bezier(0.32,0.72,0,1)" }}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                </div>
              </div>
            </SettingsRow>

            <SettingsRow>
              <RowLabel
                title="Microphone"
                description="Select your primary input device"
              />
              <CustomSelect
                value={microphoneDevice || "default"}
                onChange={handleMicChange}
                options={[
                  { value: "default", label: "System Default" },
                  ...mics.map(m => ({ value: m, label: m }))
                ]}
              />
            </SettingsRow>

            <SettingsRow>
              <RowLabel
                title="AI Polish Tone"
                description="Default conversational style for AI rewriting"
              />
              <CustomSelect
                value={toneMode}
                onChange={(v) => handleToneChange(v as ToneMode)}
                options={[
                  { value: "professional", label: "Professional" },
                  { value: "casual", label: "Casual" },
                  { value: "formal", label: "Formal" },
                ]}
              />
            </SettingsRow>

            <SettingsRow>
              <RowLabel
                title="Transcription Language"
                description="Primary language spoken — improves accuracy"
              />
              <CustomSelect
                value={language}
                onChange={handleLanguageChange}
                options={[
                  { value: "auto", label: "Auto-Detect" },
                  { value: "en", label: "English" },
                  { value: "es", label: "Spanish" },
                  { value: "fr", label: "French" },
                  { value: "de", label: "German" },
                  { value: "hi", label: "Hindi" },
                  { value: "te", label: "Telugu" },
                  { value: "zh", label: "Chinese" },
                  { value: "ja", label: "Japanese" },
                ]}
              />
            </SettingsRow>

            <SettingsRow>
              <RowLabel
                title="Save to Voice Log"
                description="Store transcription entries in your History"
              />
              <Toggle checked={historyEnabled ?? false} onChange={handleHistoryChange} />
            </SettingsRow>

            <SettingsRow last>
              <div className="flex-1 min-w-0">
                <RowLabel
                  title="Live Transcription"
                  description="See draft text while recording — Beta"
                />
              </div>
              <div className="flex items-center gap-2.5 shrink-0">
                <span className="text-[9px] font-bold uppercase tracking-widest text-signal/60 bg-signal/[0.10] border border-signal/[0.18] px-2 py-0.5 rounded-full">Beta</span>
                <Toggle
                  checked={enableLiveTranscription}
                  onChange={(v) => {
                    setLiveTranscriptionEnabled(v);
                    persistSettings({ enableLiveTranscription: v }).catch(console.error);
                  }}
                />
              </div>
            </SettingsRow>
          </div>
        </div>

      {createPortal(
        <AnimatePresence>
          {showHotkeyModal && (
            <RecordShortcutModal
              onSave={handleSaveHotkey}
              onCancel={() => setShowHotkeyModal(false)}
            />
          )}
        </AnimatePresence>,
        document.body
      )}
    </motion.div>
  );
}
