import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/store/useAppStore";
import { PROVIDERS, Provider, ProviderModel } from "@/lib/transcription";
import { POLISH_PROVIDERS } from "@/lib/polish";
import { persistSettings } from "@/hooks/useSettings";
import { openUrl } from "@tauri-apps/plugin-opener";
import { CustomSelect } from "./ui/Select";

const SPRING: [number, number, number, number] = [0.32, 0.72, 0, 1];

const PROVIDER_API_URLS: Record<string, string> = {
  groq:       "https://console.groq.com/keys",
  deepgram:   "https://console.deepgram.com/signup",
  assemblyai: "https://www.assemblyai.com/dashboard/signup",
  gemini:     "https://aistudio.google.com/app/apikey",
  anthropic:  "https://console.anthropic.com/settings/keys",
  openai:     "https://platform.openai.com/api-keys",
};

const PROVIDER_COLORS: Record<string, { bg: string; text: string; ring: string; dot: string }> = {
  groq:       { bg: "bg-[oklch(0.28_0.06_52)]",  text: "text-[oklch(0.78_0.10_52)]",  ring: "ring-[oklch(0.55_0.09_52_/_0.3)]", dot: "oklch(0.60_0.22_52)" },
  deepgram:   { bg: "bg-[oklch(0.22_0.05_195)]", text: "text-[oklch(0.70_0.09_195)]", ring: "ring-[oklch(0.50_0.08_195_/_0.3)]", dot: "oklch(0.60_0.18_195)" },
  assemblyai: { bg: "bg-[oklch(0.22_0.05_275)]", text: "text-[oklch(0.70_0.08_275)]", ring: "ring-[oklch(0.50_0.07_275_/_0.3)]", dot: "oklch(0.60_0.15_275)" },
  gemini:     { bg: "bg-[oklch(0.22_0.06_230)]", text: "text-[oklch(0.70_0.10_230)]", ring: "ring-[oklch(0.50_0.09_230_/_0.3)]", dot: "oklch(0.60_0.22_230)" },
  anthropic:  { bg: "bg-[oklch(0.26_0.06_35)]",  text: "text-[oklch(0.76_0.10_35)]",  ring: "ring-[oklch(0.55_0.09_35_/_0.3)]", dot: "oklch(0.60_0.15_35)"  },
  openai:     { bg: "bg-[oklch(0.22_0.04_160)]", text: "text-[oklch(0.68_0.08_160)]", ring: "ring-[oklch(0.48_0.07_160_/_0.3)]", dot: "oklch(0.60_0.12_160)" },
};

export default function Models() {
  const {
    transcriptionProvider,
    transcriptionModel,
    setTranscriptionProvider,
    polishProvider,
    polishEnabled,
    setPolishEnabled,
    setPolishProvider,
    providerApiKeys,
    setProviderApiKey,
  } = useAppStore();

  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="flex-1 overflow-y-auto bg-surface text-on-surface font-body p-5 md:p-7">
      <div className="max-w-full mx-auto space-y-6">

        {/* Page header */}
        <motion.div
          initial={{ opacity: 0, y: 12, filter: "blur(6px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.55, ease: SPRING }}
          className="pt-1"
        >
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-white/[0.08] bg-white/[0.04] mb-3">
            <span className="text-[9px] uppercase tracking-[0.2em] font-bold text-white/40">Engine Room</span>
          </div>
          <h1 className="text-[22px] font-headline font-bold tracking-tighter text-white">Choose your stack.</h1>
          <p className="text-white/35 text-[12px] mt-1 font-medium leading-snug">
            Smaller models are faster. Larger models are more accurate.
          </p>
        </motion.div>

        {/* Transcription section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-5">
            <SectionLabel icon={<CloudIcon />} label="Transcription" />
            <CustomSelect
              value={transcriptionProvider}
              onChange={(v) => {
                const provider = PROVIDERS.find(p => p.id === v);
                if (provider) {
                  setTranscriptionProvider(v, provider.defaultModel);
                  persistSettings({ transcriptionProvider: v, transcriptionModel: provider.defaultModel }).catch(console.error);
                }
              }}
              options={PROVIDERS.map(p => ({
                value: p.id,
                label: p.name,
                color: PROVIDER_COLORS[p.id]?.dot
              }))}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {PROVIDERS.find(p => p.id === transcriptionProvider)?.models.map((model, i) => (
              <ModelCard
                key={`${transcriptionProvider}-${model.id}`}
                provider={PROVIDERS.find(p => p.id === transcriptionProvider)!}
                model={model}
                type="transcription"
                isActive={transcriptionModel === model.id}
                apiKey={providerApiKeys[transcriptionProvider] ?? ""}
                expanded={expandedId === `trans-${transcriptionProvider}-${model.id}`}
                index={i}
                onExpand={() => setExpandedId(expandedId === `trans-${transcriptionProvider}-${model.id}` ? null : `trans-${transcriptionProvider}-${model.id}`)}
                onSave={(key) => {
                  setProviderApiKey(transcriptionProvider, key);
                  setTranscriptionProvider(transcriptionProvider, model.id);
                  persistSettings({
                    providerApiKeys: { ...useAppStore.getState().providerApiKeys, [transcriptionProvider]: key },
                    transcriptionProvider,
                    transcriptionModel: model.id,
                  }).catch(console.error);
                }}
              />
            ))}
          </div>
        </div>

        {/* AI Polish section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-5">
            <div className="flex items-center gap-4">
              <SectionLabel icon={<SparkleIcon />} label="AI Polish" />
              <div className="h-4 w-px bg-white/[0.08]" />
              <label className="flex items-center gap-2.5 cursor-pointer">
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">Active</span>
                <div
                  className={`w-9 h-[18px] rounded-full relative transition-all duration-300 border ${
                    polishEnabled ? "bg-signal border-transparent" : "bg-white/[0.05] border-white/[0.08]"
                  }`}
                  onClick={() => {
                    setPolishEnabled(!polishEnabled);
                    persistSettings({ polishEnabled: !polishEnabled }).catch(console.error);
                  }}
                >
                  <motion.div
                    layout
                    className="absolute top-[2px] left-[2px] bottom-[2px] w-3.5 bg-white rounded-full"
                    animate={{ x: polishEnabled ? 17 : 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 32 }}
                  />
                </div>
              </label>
            </div>

            <CustomSelect
              value={polishProvider}
              onChange={(v) => {
                setPolishProvider(v as any);
                persistSettings({ polishProvider: v }).catch(console.error);
              }}
              options={POLISH_PROVIDERS.map(p => ({
                value: p.id,
                label: p.label,
                color: PROVIDER_COLORS[p.id]?.dot
              }))}
            />
          </div>

          <div className={`grid grid-cols-1 md:grid-cols-2 gap-2.5 transition-all duration-500 ${
            polishEnabled ? "opacity-100" : "opacity-30 blur-[1px] pointer-events-none"
          }`}>
            {(() => {
              const p = POLISH_PROVIDERS.find(p => p.id === polishProvider);
              if (!p) return null;
              return (
                <ModelCard
                  key={`polish-${p.id}`}
                  provider={{ id: p.id, name: p.label, defaultModel: p.defaultModel, models: [] }}
                  model={{ id: p.defaultModel, name: p.defaultModel }}
                  type="polish"
                  isActive={true}
                  apiKey={providerApiKeys[p.id] ?? ""}
                  expanded={expandedId === `polish-${p.id}`}
                  index={0}
                  onExpand={() => setExpandedId(expandedId === `polish-${p.id}` ? null : `polish-${p.id}`)}
                  onSave={(key) => {
                    setProviderApiKey(p.id, key);
                    persistSettings({
                      providerApiKeys: { ...useAppStore.getState().providerApiKeys, [p.id]: key },
                    }).catch(console.error);
                  }}
                />
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Section Label ─── */
function SectionLabel({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 text-[9px] font-bold font-body text-white/30 uppercase tracking-[0.2em]">
      <span className="text-white/20">{icon}</span>
      {label}
    </div>
  );
}

/* ─── Model Card — Double-Bezel ─── */
function ModelCard({
  provider,
  model,
  isActive,
  apiKey,
  expanded,
  index,
  onExpand,
  onSave,
}: {
  provider: Provider;
  model: ProviderModel;
  type: "transcription" | "polish";
  isActive: boolean;
  apiKey: string;
  expanded: boolean;
  index: number;
  onExpand: () => void;
  onSave: (key: string) => void;
}) {
  const [localKey, setLocalKey] = useState(apiKey);
  const hasKey = !!apiKey;
  const colors = PROVIDER_COLORS[provider.id] ?? { bg: "bg-white/10", text: "text-white", ring: "" };

  const handleSave = () => {
    onSave(localKey);
    onExpand();
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.04, ease: SPRING }}
      className={expanded ? "md:col-span-2" : ""}
    >
      {/* Outer shell */}
      <div
        className={`p-[1.5px] rounded-[18px] transition-all duration-500 cursor-pointer ${
          expanded
            ? "bg-gradient-to-br from-white/[0.10] to-white/[0.03]"
            : isActive
              ? "bg-gradient-to-br from-signal/30 to-signal/05"
              : "bg-gradient-to-br from-white/[0.07] to-white/[0.02] hover:from-white/[0.10] hover:to-white/[0.04]"
        }`}
        style={{ transitionTimingFunction: "cubic-bezier(0.32,0.72,0,1)" }}
        onClick={() => !expanded && onExpand()}
      >
        {/* Inner core */}
        <div
          className={`rounded-[16.5px] overflow-hidden transition-colors duration-500 ${
            expanded
              ? "bg-[oklch(0.11_0.008_265)] shadow-[inset_0_1px_0_rgba(255,255,255,0.07)]"
              : isActive
                ? "bg-[oklch(0.11_0.02_280)] shadow-[inset_0_1px_0_rgba(255,255,255,0.07)]"
                : "bg-[oklch(0.10_0.007_265)] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
          }`}
          style={{ transitionTimingFunction: "cubic-bezier(0.32,0.72,0,1)" }}
        >
          <div className="p-4">
            {/* Card header */}
            <motion.div layout="position" className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Provider avatar — nested */}
                <div className={`p-[1px] rounded-full ${colors.ring ? `ring-1 ${colors.ring}` : ""}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold font-headline text-[13px] ${colors.bg} ${colors.text} shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]`}>
                    {provider.name[0]}
                  </div>
                </div>
                <div>
                  <h3 className="text-white font-semibold text-[13px] leading-tight">{provider.name}</h3>
                  <p className="text-white/35 text-[11px] mt-0.5 font-medium">{model.name}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {!expanded && (
                  <>
                    {!hasKey && (
                      <button className="text-[9px] font-bold uppercase tracking-widest text-signal bg-signal/10 border border-signal/20 px-2.5 py-1 rounded-full hover:bg-signal/20 transition-colors">
                        Setup
                      </button>
                    )}
                    {hasKey && isActive && (
                      <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-[oklch(0.52_0.13_148)] bg-[oklch(0.52_0.13_148_/_0.12)] border border-[oklch(0.52_0.13_148_/_0.25)] px-2.5 py-1 rounded-full">
                        <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                          <path d="M2 6l3 3 5-5" />
                        </svg>
                        Active
                      </span>
                    )}
                    {hasKey && !isActive && (
                      <span className="text-[9px] font-bold uppercase tracking-widest text-white/25 bg-white/[0.05] border border-white/[0.07] px-2.5 py-1 rounded-full">
                        Connected
                      </span>
                    )}
                  </>
                )}
                {expanded && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onExpand(); }}
                    className="p-1.5 rounded-lg hover:bg-white/[0.07] text-white/30 hover:text-white/70 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </motion.div>

            {/* Expanded body */}
            <AnimatePresence>
              {expanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3, ease: SPRING }}
                  className="overflow-hidden"
                >
                  <div className="mt-5 pt-4 border-t border-white/[0.06] space-y-5">
                    <p className="text-[12px] text-white/40 font-medium leading-relaxed">
                      Configure {model.name} on {provider.name}. All transcriptions run directly to the provider via your API key.
                    </p>

                    <div>
                      <label className="block text-[9px] font-bold uppercase tracking-[0.2em] text-white/30 mb-2">API Key</label>
                      <input
                        type="password"
                        value={localKey}
                        onChange={(e) => setLocalKey(e.target.value)}
                        placeholder={`${provider.name} API key`}
                        className="w-full bg-black/30 rounded-xl px-4 py-2.5 text-[12px] text-white/80 border border-white/[0.08]
                          outline-none focus:border-signal/40 focus:shadow-[0_0_0_2px_oklch(0.60_0.22_280_/_0.15)]
                          transition-all font-mono placeholder:font-body placeholder:text-white/20"
                        style={{ transitionTimingFunction: "cubic-bezier(0.32,0.72,0,1)" }}
                      />
                      <p className="text-[11px] text-white/25 mt-2 font-medium flex items-center gap-1">
                        Get your {provider.name} API key
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const url = PROVIDER_API_URLS[provider.id];
                            if (url) openUrl(url).catch(console.error);
                          }}
                          className="text-signal/70 hover:text-signal transition-colors underline underline-offset-2 inline-flex items-center gap-1"
                        >
                          here
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </button>
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); onExpand(); }}
                          className="px-4 py-2 rounded-full text-[11px] font-bold uppercase tracking-widest text-white/40 bg-white/[0.05] border border-white/[0.07] hover:bg-white/[0.09] transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleSave(); }}
                          className="px-4 py-2 rounded-full text-[11px] font-bold uppercase tracking-widest bg-white text-black hover:bg-zinc-100 transition-colors active:scale-[0.97]"
                        >
                          Save
                        </button>
                      </div>
                      {hasKey && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setLocalKey("");
                            onSave("");
                            onExpand();
                          }}
                          className="px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest text-signal/60 hover:text-signal hover:bg-signal/[0.08] border border-signal/[0.15] transition-colors"
                        >
                          Disconnect
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Icons ─── */
function CloudIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
    </svg>
  );
}
function SparkleIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  );
}
