import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { invoke } from "@tauri-apps/api/core";
import { useAppStore } from "@/store/useAppStore";
import { persistSettings } from "@/hooks/useSettings";

const SPRING: [number, number, number, number] = [0.32, 0.72, 0, 1];

export default function WelcomeScreen() {
  const { setHasSeenWelcome, microphoneDevice } = useAppStore();
  const [step, setStep] = useState<"welcome" | "permission" | "ready">("welcome");
  const [error, setError] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  const requestMicAccess = async () => {
    setIsTesting(true);
    setError(null);
    try {
      // Small delay for UI feel
      await new Promise(r => setTimeout(r, 800));
      await invoke("init_audio_stream", { deviceName: microphoneDevice });
      setStep("ready");
    } catch (err) {
      console.error("[welcome] Mic access failed:", err);
      const msg = typeof err === 'string' ? err : "Microphone access denied or not found.";
      setError(msg);
    } finally {
      setIsTesting(false);
    }
  };

  const handleFinish = async () => {
    setHasSeenWelcome(true);
    await persistSettings({ hasSeenWelcome: true });
  };

  return (
    <div className="fixed inset-0 z-[100] bg-surface flex items-center justify-center p-6 md:p-12 overflow-hidden font-body text-on-surface select-none">
      {/* Background Ambient Warmth */}
      <div className="absolute inset-0 ambient-bg opacity-30 pointer-events-none" />
      
      <div className="relative z-10 max-w-md w-full text-center">
        <AnimatePresence mode="wait">
          {step === "welcome" && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, y: 20, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -20, filter: "blur(10px)" }}
              transition={{ duration: 0.6, ease: SPRING }}
            >
              <div className="mb-10 flex justify-center">
                <div className="w-16 h-16 rounded-3xl bg-signal flex items-center justify-center shadow-[0_0_32px_oklch(0.68_0.12_35_/_0.3)]">
                  <span className="text-white font-headline font-bold text-4xl">V</span>
                </div>
              </div>
              <h1 className="text-4xl font-headline font-bold tracking-tight mb-4">Welcome to Voxel</h1>
              <p className="text-on-surface/40 text-sm leading-relaxed mb-10 font-medium">
                Whisper-powered transcription that feels like magic. <br />
                Ready to transform the way you write?
              </p>
              <button
                onClick={() => setStep("permission")}
                className="w-full bg-white text-black py-3.5 rounded-2xl font-bold tracking-tight hover:bg-zinc-200 transition-all active:scale-[0.98]"
              >
                Let's get started
              </button>
            </motion.div>
          )}

          {step === "permission" && (
            <motion.div
              key="permission"
              initial={{ opacity: 0, scale: 0.95, filter: "blur(4px)" }}
              animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, scale: 1.05, filter: "blur(10px)" }}
              transition={{ duration: 0.5, ease: SPRING }}
              className="bg-surface-container-low/50 backdrop-blur-2xl border border-on-surface/[0.08] p-8 rounded-[32px] shadow-2xl"
            >
              <div className="w-12 h-12 rounded-2xl bg-signal/15 text-signal flex items-center justify-center mx-auto mb-6">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4M9 11V7a3 3 0 016 0v4a3 3 0 01-6 0z" />
                </svg>
              </div>
              <h2 className="text-2xl font-headline font-bold mb-3 tracking-tight">Access Microphone</h2>
              <p className="text-on-surface/40 text-[13px] leading-relaxed mb-8 font-medium">
                Voxel needs to hear you to work its magic. <br />
                We'll test your connection now.
              </p>

              {error ? (
                <div className="mb-8 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                  <p className="text-red-400 text-xs font-bold leading-relaxed">
                    {error} <br />
                    <span className="opacity-70 mt-1 block">Go to Windows Settings &gt; Privacy &gt; Microphone to allow access.</span>
                  </p>
                </div>
              ) : null}

              <button
                disabled={isTesting}
                onClick={requestMicAccess}
                className={`w-full py-3.5 rounded-2xl font-bold tracking-tight transition-all active:scale-[0.98] ${
                  isTesting 
                  ? "bg-white/10 text-white/20 cursor-wait" 
                  : "bg-signal text-white shadow-[0_4px_16px_oklch(0.68_0.12_35_/_0.2)] hover:bg-signal/90"
                }`}
              >
                {isTesting ? "Testing Microphone..." : error ? "Try Again" : "Authorize Microphone"}
              </button>
            </motion.div>
          )}

          {step === "ready" && (
            <motion.div
              key="ready"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, ease: SPRING }}
            >
              <div className="w-16 h-16 rounded-full bg-active/20 text-active flex items-center justify-center mx-auto mb-8 shadow-[0_0_32px_oklch(0.62_0.16_160_/_0.2)]">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-3xl font-headline font-bold mb-4 tracking-tight">You're all set!</h2>
              <p className="text-on-surface/40 text-sm leading-relaxed mb-10 font-medium">
                Microphone connected successfully. <br />
                Voxel is idling in your background, ready for action.
              </p>
              <button
                onClick={handleFinish}
                className="w-full bg-white text-black py-3.5 rounded-2xl font-bold tracking-tight hover:bg-zinc-200 transition-all active:scale-[0.98]"
              >
                Launch Dashboard
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer Branding */}
      <div className="absolute bottom-10 left-0 right-0 text-center opacity-20 pointer-events-none">
        <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-on-surface">VOXEL v0.1.0</span>
      </div>
    </div>
  );
}
