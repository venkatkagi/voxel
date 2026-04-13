import { useState } from "react";
import Sidebar from "./Sidebar";
import HomeSettings from "./HomeSettings";
import Models from "./Models";
import Overview from "./Overview";
import History from "./History";
import TitleBar from "./TitleBar";
import Toast from "./Toast";

type TabId = "home" | "models" | "history" | "settings" | "help";

export default function Settings() {
  const [activeTab, setActiveTab] = useState<TabId>("home");

  return (
    <div className="flex flex-col h-screen bg-transparent font-body text-on-surface overflow-hidden">
      {/* Outer window frame with rounded corners */}
      <div className="flex flex-col flex-1 m-[1px] rounded-2xl overflow-hidden bg-surface border border-white/[0.06] shadow-2xl ambient-bg noise-shell">
        {/* Custom title bar */}
        <TitleBar />

        {/* Divider */}
        <div className="h-px bg-white/[0.04] shrink-0" />

        {/* Main content */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            {activeTab === "home" && <Overview />}
            {activeTab === "models" && <Models />}
            {activeTab === "history" && <HistoryWrapper />}
            {activeTab === "settings" && <HomeSettings />}
            {activeTab === "help" && (
              <div className="flex-1 flex items-center justify-center bg-surface">
                <div className="text-center space-y-2">
                  <div className="w-8 h-8 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mx-auto">
                    <svg className="w-4 h-4 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-white/20 font-body text-[11px] font-semibold uppercase tracking-[0.2em]">Documentation coming soon</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <Toast />
    </div>
  );
}

function HistoryWrapper() {
  return (
    <div className="flex-1 overflow-y-auto bg-surface p-5 md:p-7">
      <div className="max-w-full mx-auto">
        <div className="mb-5 pt-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-white/[0.08] bg-white/[0.04] mb-3">
            <span className="text-[9px] uppercase tracking-[0.2em] font-bold text-white/40">Recordings</span>
          </div>
          <h1 className="text-[22px] font-headline font-bold tracking-tighter text-white">Voice Log</h1>
        </div>
        <History />
      </div>
    </div>
  );
}
