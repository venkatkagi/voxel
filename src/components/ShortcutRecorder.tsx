import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";

const SPRING: [number, number, number, number] = [0.32, 0.72, 0, 1];

/* ─── Premium 3D Keycap ─── */
interface KeycapProps {
  label: string;
  sublabel?: string;
  icon?: React.ReactNode;
}

export function Keycap({ label, sublabel, icon }: KeycapProps) {
  return (
    /* Outer shell — the "keycap socket" */
    <div className="p-[1.5px] rounded-[10px] bg-gradient-to-b from-white/[0.12] to-white/[0.04]">
      {/* Inner core — the keycap face */}
      <div className="relative min-w-[60px] h-14 rounded-[8.5px] flex flex-col items-center justify-center gap-0.5
        bg-gradient-to-b from-[oklch(0.25_0.01_265)] to-[oklch(0.16_0.01_265)]
        shadow-[inset_0_1px_0_rgba(255,255,255,0.14),inset_0_-2px_0_rgba(0,0,0,0.5),0_3px_0_0_oklch(0.08_0.005_265)]"
      >
        <div className="text-white text-[18px] font-bold font-headline leading-none">
          {icon || label}
        </div>
        {sublabel && (
          <div className="text-[8px] text-white/30 uppercase tracking-tight font-bold">{sublabel}</div>
        )}
      </div>
    </div>
  );
}

/* ─── Shortcut Recording Modal ─── */
interface RecordShortcutModalProps {
  onSave: (hotkey: string) => void;
  onCancel: () => void;
}

export function RecordShortcutModal({ onSave, onCancel }: RecordShortcutModalProps) {
  const [keys, setKeys] = useState<string[]>([]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      const newKeys: string[] = [];
      if (e.ctrlKey)  newKeys.push("Ctrl");
      if (e.shiftKey) newKeys.push("Shift");
      if (e.altKey)   newKeys.push("Alt");
      if (e.metaKey)  newKeys.push("Win");

      const key = e.key === " " ? "Space" : e.key.charAt(0).toUpperCase() + e.key.slice(1);
      if (!["Control", "Shift", "Alt", "Meta", "OS"].includes(key)) {
        newKeys.push(key);
      }
      if (newKeys.length > 0) setKeys(newKeys);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onCancel}
        className="absolute inset-0 bg-black/75 backdrop-blur-2xl"
      />

      {/* Modal — Double-Bezel */}
      <motion.div
        initial={{ opacity: 0, scale: 0.88, y: 24, filter: "blur(8px)" }}
        animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
        exit={{ opacity: 0, scale: 0.92, y: 12, filter: "blur(4px)" }}
        transition={{ duration: 0.4, ease: SPRING }}
        className="relative w-full max-w-md"
      >
        {/* Outer shell */}
        <div className="p-[1.5px] rounded-[26px] bg-gradient-to-br from-white/[0.12] to-white/[0.03]">
          {/* Inner core */}
          <div className="rounded-[24.5px] overflow-hidden bg-[oklch(0.10_0.008_265)] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
            <div className="p-6 space-y-5">

              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-white/[0.08] bg-white/[0.04] mb-2">
                    <span className="text-[8px] uppercase tracking-[0.2em] font-bold text-white/40">Keyboard</span>
                  </div>
                  <h2 className="text-[18px] font-headline font-bold tracking-tighter text-white">Record Shortcut</h2>
                </div>
                <button
                  onClick={onCancel}
                  className="w-8 h-8 rounded-xl bg-white/[0.05] border border-white/[0.07] flex items-center justify-center text-white/30 hover:text-white/70 hover:bg-white/[0.09] transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <p className="text-white/35 text-[12px] font-medium text-center leading-relaxed">
                Press and hold the key combination you want to use
              </p>

              {/* Key display area */}
              <div className="p-[1.5px] rounded-[18px] bg-gradient-to-br from-white/[0.06] to-white/[0.01]">
                <div className="h-36 rounded-[16.5px] bg-black/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] flex items-center justify-center gap-3">
                  {keys.length === 0 ? (
                    <motion.p
                      animate={{ opacity: [0.3, 0.7, 0.3] }}
                      transition={{ duration: 2.5, repeat: Infinity }}
                      className="text-white/25 font-body text-[12px] font-medium"
                    >
                      Waiting for input…
                    </motion.p>
                  ) : (
                    <motion.div
                      className="flex items-center gap-2.5"
                      initial={{ opacity: 0, scale: 0.85 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.25, ease: SPRING }}
                    >
                      {keys.map((k, i) => (
                        <div key={k} className="flex items-center gap-2.5">
                          <Keycap
                            label={k}
                            sublabel={
                              k === "Win"   ? "win"     :
                              k === "Ctrl"  ? "control" :
                              k === "Shift" ? "shift"   :
                              k === "Alt"   ? "alt"     :
                              k.toLowerCase()
                            }
                            icon={
                              k === "Win"   ? <WinIcon />   :
                              k === "Shift" ? <ShiftIcon /> :
                              undefined
                            }
                          />
                          {i < keys.length - 1 && (
                            <span className="text-white/20 text-[18px] font-bold font-headline">+</span>
                          )}
                        </div>
                      ))}
                    </motion.div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-1">
                <button
                  onClick={() => setKeys([])}
                  className="px-4 py-2 rounded-full text-[11px] font-bold uppercase tracking-widest text-white/35 bg-white/[0.05] border border-white/[0.07] hover:bg-white/[0.09] hover:text-white/60 transition-colors"
                >
                  Clear
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={onCancel}
                    className="px-4 py-2 rounded-full text-[11px] font-bold uppercase tracking-widest text-white/35 hover:text-white/60 transition-colors"
                  >
                    Cancel
                  </button>

                  {/* Primary CTA — pill with nested icon */}
                  <button
                    onClick={() => keys.length > 0 && onSave(keys.join("+"))}
                    disabled={keys.length === 0}
                    className="group flex items-center gap-0 px-4 py-2 rounded-full text-[11px] font-bold uppercase tracking-widest
                      bg-white text-black hover:bg-zinc-100 disabled:opacity-30 disabled:cursor-not-allowed
                      transition-all active:scale-[0.97]"
                    style={{ transitionTimingFunction: "cubic-bezier(0.32,0.72,0,1)" }}
                  >
                    Save Shortcut
                    <div className="ml-2 w-5 h-5 rounded-full bg-black/[0.08] flex items-center justify-center group-hover:translate-x-0.5 transition-transform">
                      <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/* ─── Icons ─── */
function WinIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M0 3.449L9.75 2.1L9.752 11.458L0 11.464V3.449ZM0 12.536L9.752 12.542V21.9L0 20.551V12.536ZM10.865 1.947L24 0V11.458L10.865 11.464V1.947ZM24 12.542V24L10.865 22.053V12.542H24Z" />
    </svg>
  );
}
function ShiftIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m0-16l-7 7m7-7l7 7" />
    </svg>
  );
}
