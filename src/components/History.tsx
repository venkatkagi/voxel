import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore, TranscriptEntry, ToneMode } from "@/store/useAppStore";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";

// Each tone has a distinct hue — desaturated enough to be informational, not decorative.
const TONE_STYLES: Record<ToneMode, { text: string; bg: string; border: string }> = {
  professional: {
    text: "text-[oklch(0.70_0.09_240)]",
    bg: "bg-[oklch(0.55_0.09_240/0.12)]",
    border: "border-[oklch(0.55_0.09_240/0.20)]",
  },
  casual: {
    text: "text-[oklch(0.72_0.10_52)]",
    bg: "bg-[oklch(0.55_0.10_52/0.12)]",
    border: "border-[oklch(0.55_0.10_52/0.20)]",
  },
  formal: {
    text: "text-[oklch(0.65_0.04_270)]",
    bg: "bg-[oklch(0.50_0.04_270/0.12)]",
    border: "border-[oklch(0.50_0.04_270/0.20)]",
  },
};

const EASE_OUT: [number, number, number, number] = [0.25, 1, 0.5, 1];

// Stagger config — each card reveals slightly after the previous.
const LIST_VARIANTS = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};

const CARD_VARIANTS = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.28, ease: EASE_OUT } },
};

// Animated checkmark drawn via SVG stroke-dasharray trick.
function CheckMark() {
  return (
    <motion.svg
      className="w-3.5 h-3.5"
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <motion.path
        d="M2 7l4 4 6-6"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] as const }}
      />
    </motion.svg>
  );
}

export default function History() {
  const { history, loadHistory } = useAppStore();
  const [copied, setCopied] = useState<number | null>(null);

  useEffect(() => {
    loadHistory().catch(console.error);
  }, []);

  async function handleCopy(entry: TranscriptEntry) {
    await writeText(entry.polished);
    setCopied(entry.id);
    setTimeout(() => setCopied(null), 1800);
  }

  function formatTime(timestamp: number): string {
    return new Date(timestamp).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  if (history.length === 0) {
    return (
      <motion.div
        className="flex flex-col items-center justify-center py-20 text-center"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32, ease: EASE_OUT }}
      >
        <svg className="w-10 h-10 text-zinc-700 mb-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4M9 11V7a3 3 0 016 0v4a3 3 0 01-6 0z" />
        </svg>
        <h3 className="text-zinc-400 font-headline font-semibold text-base tracking-tight">Nothing recorded yet</h3>
        <p className="text-zinc-600 mt-1.5 text-sm font-body">Hold your hotkey, speak, release. Transcripts appear here.</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="space-y-4"
      variants={LIST_VARIANTS}
      initial="hidden"
      animate="visible"
    >
      {history.map((entry) => (
        <motion.div
          key={entry.id}
          variants={CARD_VARIANTS}
          className="bg-surface-container-low/40 backdrop-blur-xl rounded-[20px] p-6
            border border-white/5 group cursor-default
            transition-colors duration-300 hover:bg-surface-container/60"
        >
          <div className="flex items-start justify-between gap-6 mb-5">
            <p className="text-on-surface text-[14px] leading-relaxed whitespace-pre-wrap flex-1 max-w-[65ch]">
              {entry.polished}
            </p>

            {/* Copy button — invisible until hover, swaps to checkmark on success */}
            <motion.button
              onClick={() => handleCopy(entry)}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full
                text-[10px] font-bold font-headline uppercase tracking-widest
                border transition-colors duration-200
                ${copied === entry.id
                  ? "bg-signal/15 text-signal border-signal/25"
                  : "bg-white/5 text-white/60 border-white/8 hover:bg-white/10 hover:text-white"
                }
                opacity-0 group-hover:opacity-100 focus:opacity-100`}
              whileTap={{ scale: 0.93 }}
              transition={{ duration: 0.12 }}
              aria-label={copied === entry.id ? "Copied" : "Copy to clipboard"}
            >
              <AnimatePresence mode="wait" initial={false}>
                {copied === entry.id ? (
                  <motion.span
                    key="check"
                    className="flex items-center gap-1.5"
                    initial={{ opacity: 0, scale: 0.7 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.7 }}
                    transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <CheckMark />
                    Copied
                  </motion.span>
                ) : (
                  <motion.span
                    key="copy"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.1 }}
                  >
                    Copy
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          </div>

          <div className="flex items-center gap-3 text-[10px] font-headline font-semibold text-zinc-600 uppercase tracking-widest">
            <span>{formatTime(entry.timestamp)}</span>
            <span className="w-[3px] h-[3px] rounded-full bg-zinc-700" aria-hidden />
            {(() => {
              const t = TONE_STYLES[entry.tone] ?? TONE_STYLES.professional;
              return (
                <span className={`px-2 py-0.5 rounded-full border ${t.text} ${t.bg} ${t.border}`}>
                  {entry.tone}
                </span>
              );
            })()}
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}
