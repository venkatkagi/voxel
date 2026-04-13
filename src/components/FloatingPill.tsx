import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const EASE_OUT: [number, number, number, number] = [0.25, 1, 0.5, 1];
import type { RecordingState } from "@/store/useAppStore";

interface LiveText {
  stableText: string;
  draftText: string;
}

// Each bar oscillates independently on a sine wave driven by a shared clock.
// Amplitude scales the overall height; frequency and phase give each bar a
// distinct rhythm so they never move in lockstep.
const BAR_CONFIG = [
  { freq: 1.7, phase: 0.0,  base: 0.35 },
  { freq: 2.3, phase: 0.9,  base: 0.55 },
  { freq: 1.4, phase: 1.7,  base: 0.75 },
  { freq: 2.8, phase: 2.5,  base: 1.00 },
  { freq: 1.9, phase: 3.3,  base: 0.75 },
  { freq: 2.1, phase: 4.1,  base: 0.55 },
  { freq: 1.6, phase: 5.0,  base: 0.35 },
] as const;

const MIN_H = 3;
const MAX_H = 20;

function Waveform({ amplitude }: { amplitude: number }) {
  const [heights, setHeights] = useState<number[]>(BAR_CONFIG.map(() => MIN_H));
  const rafRef = useRef<number>(0);
  const startRef = useRef<number>(0);
  // Smooth amplitude so sudden mic drops don't snap bars to zero
  const smoothAmp = useRef<number>(0);

  useEffect(() => {
    startRef.current = performance.now();

    function tick(now: number) {
      const t = (now - startRef.current) / 1000;
      const target = Math.min(1.0, amplitude * 30);
      // Exponential smoothing: fast rise (0.2), slow fall (0.06)
      smoothAmp.current += (target > smoothAmp.current ? 0.2 : 0.06) * (target - smoothAmp.current);
      const amp = smoothAmp.current;

      setHeights(
        BAR_CONFIG.map(({ freq, phase, base }) => {
          const sine = (Math.sin(t * freq * Math.PI * 2 + phase) + 1) / 2; // 0..1
          const raw = amp > 0.04
            ? base * amp + sine * amp * 0.6
            : 0.08; // idle breathing height
          return Math.round(Math.max(MIN_H, Math.min(MAX_H, raw * MAX_H)));
        })
      );

      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [amplitude]);

  return (
    <div className="flex items-center gap-[3px] h-6 justify-center overflow-hidden">
      {heights.map((h, i) => (
        <motion.div
          key={i}
          animate={{ height: h }}
          transition={{ duration: 0.08, ease: "easeOut" }}
          className="w-[3px] bg-white rounded-full"
          style={{ opacity: 0.75 + (h / MAX_H) * 0.25 }}
        />
      ))}
    </div>
  );
}

// Three dots that pulse with offset timing — used during processing / polishing
function Dots({ color = "bg-zinc-400" }: { color?: string }) {
  return (
    <div className="flex items-center gap-[5px] h-5">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          animate={{ opacity: [0.25, 1, 0.25], scaleY: [0.6, 1.1, 0.6] }}
          transition={{
            duration: 1.1,
            delay: i * 0.18,
            repeat: Infinity,
            ease: EASE_OUT,
          }}
          className={`w-[5px] h-[5px] rounded-full ${color}`}
        />
      ))}
    </div>
  );
}


export default function FloatingPill() {
  const [state, setState] = useState<RecordingState>("idle");
  const [amplitude, setAmplitude] = useState<number>(0);
  const [live, setLive] = useState<LiveText>({ stableText: "", draftText: "" });

  useEffect(() => {
    let unlistenState: (() => void) | undefined;
    let unlistenAmp: (() => void) | undefined;
    let unlistenLive: (() => void) | undefined;

    import("@tauri-apps/api/event").then(({ listen }) => {
      listen<RecordingState>("recording-state-changed", (event) => {
        const newState = event.payload;
        setState(newState);
        if (newState === "idle") {
          import("@tauri-apps/api/core").then(({ invoke }) => {
            invoke("hide_pill").catch(console.error);
          });
        }
      }).then((fn) => { unlistenState = fn; });

      listen<number>("audio-amplitude", (event) => {
        setAmplitude(event.payload);
      }).then((fn) => { unlistenAmp = fn; });

      listen<LiveText>("live-transcription-changed", (event) => {
        setLive(event.payload);
      }).then((fn) => { unlistenLive = fn; });
    });

    return () => {
      unlistenState?.();
      unlistenAmp?.();
      unlistenLive?.();
    };
  }, []);

  const isVisible = state !== "idle";
  const hasText = Boolean(live.stableText || live.draftText);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key="pill"
          layout
          initial={{ opacity: 0, scale: 0.82, y: 14 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.84, y: 10 }}
          transition={{ type: "spring", stiffness: 380, damping: 28 }}
          className={`fixed bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 py-2 min-h-[40px] rounded-full
            shadow-[0_24px_48px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.08)]
            backdrop-blur-3xl border border-white/[0.06] pointer-events-none select-none z-50
            overflow-hidden font-body bg-black/85 text-white
            ${hasText ? "px-5 max-w-[85vw] text-[13px]" : "px-4 justify-center text-[11px]"}`}
        >
          {/* Recording: live waveform */}
          <AnimatePresence mode="wait">
            {state === "recording" && (
              <motion.div
                key="waveform"
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.7 }}
                transition={{ duration: 0.18, ease: EASE_OUT }}
              >
                <Waveform amplitude={amplitude} />
              </motion.div>
            )}

            {/* Processing: dots */}
            {state === "processing" && (
              <motion.div
                key="scan"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <Dots color="bg-zinc-400" />
              </motion.div>
            )}

            {/* Polishing: violet dots */}
            {state === "polishing" && (
              <motion.div
                key="dots"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <Dots color="bg-violet-400" />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Live transcript text */}
          <AnimatePresence mode="popLayout">
            {hasText && (
              <motion.div
                layout="position"
                className="flex-1 whitespace-nowrap overflow-hidden text-ellipsis normal-case tracking-normal font-medium leading-[1.35] select-none"
                initial={{ opacity: 0, x: 6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -4 }}
                transition={{ duration: 0.22, ease: EASE_OUT }}
              >
                {live.stableText && <span>{live.stableText} </span>}
                {live.draftText && (
                  <span className="text-white/50 italic">{live.draftText}</span>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
