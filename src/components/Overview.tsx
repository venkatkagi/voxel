import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { useAppStore } from "@/store/useAppStore";

const SPRING: [number, number, number, number] = [0.32, 0.72, 0, 1];

export default function Overview() {
  const { history, hotkey } = useAppStore();

  const stats = useMemo(() => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const todayHistory = history.filter(h => h.timestamp >= startOfDay);

    let todayWords = 0;
    todayHistory.forEach((entry) => {
      todayWords += (entry.polished || "").split(/\s+/).filter(Boolean).length;
    });

    let totalWords = 0;
    history.forEach((entry) => {
      totalWords += (entry.polished || "").split(/\s+/).filter(Boolean).length;
    });

    const totalTranscriptions = history.length;
    const timeSavedSeconds = totalTranscriptions * 1.5 + totalWords * 0.1;
    const timeSavedMins = Math.round(timeSavedSeconds / 60);

    const dates = history.map(h => new Date(h.timestamp).toDateString());
    const uniqueDates = Array.from(new Set(dates));

    return {
      todayWords: todayWords.toLocaleString(),
      totalWords: totalWords.toLocaleString(),
      streak: uniqueDates.length,
      timeSavedMins,
      transcriptions: totalTranscriptions,
    };
  }, [history]);

  const hotkeyParts = hotkey.split("+");

  return (
    <div className="flex-1 overflow-y-auto bg-surface p-5 md:p-6 font-body text-white">
      <div className="max-w-full mx-auto space-y-4">

        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: SPRING }}
          className="pt-1 pb-1"
        >
          <h1 className="text-[22px] font-headline font-bold tracking-tighter text-white leading-tight">
            Good to have you back.
          </h1>
          <p className="text-white/35 text-[13px] mt-1 font-medium">
            {stats.todayWords === "0"
              ? "Hold your hotkey and start speaking."
              : `${stats.todayWords} words spoken today`}
          </p>
        </motion.header>

        {/* Asymmetrical Bento Grid */}
        <div className="grid grid-cols-4 gap-2.5">

          {/* Hero: Today Words — spans left half on md */}
          <BentoCard delay={0.08} className="col-span-4 md:col-span-2">
            <div className="flex flex-col justify-between min-h-[108px]">
              <div className="flex items-start justify-between">
                <span className="text-[9px] uppercase tracking-[0.2em] font-bold text-white/30">Today</span>
                <TextIcon />
              </div>
              <div>
                <div className="text-[44px] font-headline font-bold tracking-tighter leading-none text-white">
                  {stats.todayWords}
                </div>
                <div className="text-[9px] text-white/25 uppercase tracking-widest font-bold mt-1.5">words dictated</div>
              </div>
            </div>
          </BentoCard>

          {/* Streak — glowing violet card */}
          <BentoCard delay={0.13} className="col-span-2 md:col-span-1" glow>
            <div className="flex flex-col justify-between min-h-[108px]">
              <div className="flex items-start justify-between">
                <span className="text-[9px] uppercase tracking-[0.2em] font-bold text-white/30">Streak</span>
                <StreakIcon />
              </div>
              <div>
                <div className="text-[40px] font-headline font-bold tracking-tighter leading-none text-white">{stats.streak}</div>
                <div className="text-[9px] text-white/25 uppercase tracking-widest font-bold mt-1.5">days active</div>
              </div>
            </div>
          </BentoCard>

          {/* Time Saved */}
          <BentoCard delay={0.17} className="col-span-2 md:col-span-1">
            <div className="flex flex-col justify-between min-h-[108px]">
              <div className="flex items-start justify-between">
                <span className="text-[9px] uppercase tracking-[0.2em] font-bold text-white/30">Saved</span>
                <TimeIcon />
              </div>
              <div>
                <div className="text-[40px] font-headline font-bold tracking-tighter leading-none text-white">{stats.timeSavedMins}</div>
                <div className="text-[9px] text-white/25 uppercase tracking-widest font-bold mt-1.5">mins reclaimed</div>
              </div>
            </div>
          </BentoCard>

          {/* All-Time Transcriptions */}
          <BentoCard delay={0.21} className="col-span-2 md:col-span-2">
            <div className="flex flex-col justify-between min-h-[88px]">
              <div className="flex items-start justify-between">
                <span className="text-[9px] uppercase tracking-[0.2em] font-bold text-white/30">All Time</span>
                <MicIcon className="text-white/20" />
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-[40px] font-headline font-bold tracking-tighter leading-none text-white">{stats.transcriptions}</div>
                  <div className="text-[9px] text-white/25 uppercase tracking-widest font-bold mt-1.5">transcriptions</div>
                </div>
                <span className="text-[10px] text-white/15 font-bold pb-0.5">{stats.totalWords} total</span>
              </div>
            </div>
          </BentoCard>

          {/* Active Dictation CTA */}
          <BentoCard delay={0.25} className="col-span-4 md:col-span-2">
            <div className="flex items-center justify-between gap-3 min-h-[88px]">
              <div className="space-y-2">
                <div className="text-[9px] uppercase tracking-[0.2em] font-bold text-white/30">Active Dictation</div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[13px] font-semibold text-white/60">Hold</span>
                  {hotkeyParts.map((k, i) => (
                    <span key={k} className="flex items-center gap-1">
                      <kbd className="bg-white/[0.07] border border-white/[0.1] px-2 py-0.5 rounded-md font-mono text-[10px] text-white/60 shadow-[inset_0_-1px_0_rgba(0,0,0,0.5)] tracking-tight">
                        {k}
                      </kbd>
                      {i < hotkeyParts.length - 1 && (
                        <span className="text-white/20 text-[9px] font-bold">+</span>
                      )}
                    </span>
                  ))}
                  <span className="text-[13px] font-semibold text-white/60">to dictate</span>
                </div>
              </div>

              <div className="shrink-0 w-9 h-9 rounded-full border border-white/[0.08] bg-white/[0.04] flex items-center justify-center text-white/40">
                <MicIcon className="text-white/40" />
              </div>
            </div>
          </BentoCard>

        </div>
      </div>
    </div>
  );
}

/* ─── Clean Bento Card — single border, no gradient rings ─── */
function BentoCard({
  children,
  delay = 0,
  className = "",
  glow = false,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  glow?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.5, delay, ease: SPRING }}
      className={`${className} border rounded-[18px] p-4 h-full transition-all duration-300 ${
        glow
          ? "border-signal/[0.15] bg-surface-container-high"
          : "border-on-surface/[0.04] bg-surface-container-low hover:bg-surface-container hover:border-on-surface/[0.08]"
      }`}
    >
      {children}
    </motion.div>
  );
}

/* ─── Icons ─── */
function TextIcon() {
  return (
    <svg className="w-3.5 h-3.5 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
    </svg>
  );
}
function StreakIcon() {
  return (
    <svg className="w-3.5 h-3.5 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.5-7 3 10 1 15 1 15z" />
    </svg>
  );
}
function TimeIcon() {
  return (
    <svg className="w-3.5 h-3.5 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
function MicIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={`w-4.5 h-4.5 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-20a3 3 0 013 3v8a3 3 0 01-6 0V5a3 3 0 013-3z" />
    </svg>
  );
}
