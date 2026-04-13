import React from "react";
import { motion } from "framer-motion";
import logo from "@/assets/logo.png";

type TabId = "home" | "models" | "history" | "settings" | "help";

interface SidebarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

const SPRING: [number, number, number, number] = [0.32, 0.72, 0, 1];

export default function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  const navItems: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: "home",    label: "Overview", icon: <HomeIcon /> },
    { id: "history", label: "Voice Log", icon: <HistoryIcon /> },
    { id: "models",  label: "Models",    icon: <ModelsIcon /> },
  ];

  const bottomItems: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: "settings", label: "Settings", icon: <SettingsIcon /> },
    { id: "help",     label: "Help",     icon: <HelpIcon /> },
  ];

  return (
    <div className="w-full md:w-48 shrink-0 h-auto md:h-screen flex flex-col
      bg-surface/60 backdrop-blur-3xl
      border-b md:border-b-0 md:border-r border-on-surface/[0.05]
      md:supports-[height:100cqh]:h-[100cqh]"
    >
      {/* Logo area */}
      <div className="px-4 py-5 md:py-7 flex justify-between items-center md:items-start md:flex-col gap-4">
        <div className="flex flex-col gap-3">
          {/* Double-Bezel logo */}
          <div className="p-[1.5px] rounded-[13px] bg-gradient-to-br from-on-surface/[0.12] to-on-surface/[0.02] w-fit">
            <div className="rounded-[11.5px] overflow-hidden bg-surface-container-high shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
              <img src={logo} alt="Voxel" className="w-8 h-8 block" />
            </div>
          </div>

          <div>
            <div className="text-[17px] font-black font-headline tracking-tighter text-white uppercase italic leading-none">
              Voxel
            </div>
            <div className="text-[8px] uppercase tracking-[0.2em] text-white/25 mt-1 font-body hidden md:block">
              The Silent Conductor
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-none md:flex-1 md:mt-1 space-x-1.5 md:space-x-0 md:space-y-0.5 px-2.5 flex flex-row md:flex-col overflow-x-auto pb-3 md:pb-0 scrollbar-hide">
        {navItems.map((item, i) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: i * 0.05, ease: SPRING }}
          >
            <NavItem
              active={activeTab === item.id}
              onClick={() => onTabChange(item.id)}
              icon={item.icon}
              label={item.label}
            />
          </motion.div>
        ))}

        {/* Mobile separator */}
        <div className="w-[1px] bg-white/[0.05] my-1.5 block md:hidden mx-1.5 shrink-0" />

        {/* Bottom items shown inline on mobile */}
        {bottomItems.map((item) => (
          <div key={item.id} className="block md:hidden">
            <NavItem
              active={activeTab === item.id}
              onClick={() => onTabChange(item.id)}
              icon={item.icon}
              label={item.label}
            />
          </div>
        ))}
      </nav>

      {/* Desktop bottom items */}
      <div className="hidden md:block px-2.5 space-y-0.5 border-t border-white/[0.05] mt-auto py-3">
        {bottomItems.map((item) => (
          <NavItem
            key={item.id}
            active={activeTab === item.id}
            onClick={() => onTabChange(item.id)}
            icon={item.icon}
            label={item.label}
          />
        ))}
      </div>
    </div>
  );
}

function NavItem({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative w-full flex items-center gap-2.5 px-3 py-2 rounded-xl
        transition-all duration-500 group
        text-[10px] font-body font-semibold tracking-widest uppercase
        active:scale-[0.97]
        ${active ? "text-white" : "text-white/35 hover:text-white/70"}`}
      style={{ transitionTimingFunction: "cubic-bezier(0.32,0.72,0,1)" }}
    >
      {/* Active pill — subtle bg lift, no glow */}
      {active && (
        <motion.div
          layoutId="sidebar-active"
          className="absolute inset-0 rounded-xl bg-on-surface/[0.06] border border-on-surface/[0.04]"
          initial={false}
          transition={{ type: "spring", stiffness: 380, damping: 32 }}
        />
      )}

      {/* Hover state for inactive */}
      {!active && (
        <div className="absolute inset-0 rounded-xl bg-white/0 group-hover:bg-white/[0.04] transition-colors duration-300" />
      )}

      <div className="relative z-10 flex items-center gap-2.5 w-full pl-0.5">
        <span className={`transition-colors duration-300 ${active ? "text-white" : "text-white/30 group-hover:text-white/50"}`}>
          {icon}
        </span>
        <span className="tracking-widest">{label}</span>
      </div>
    </button>
  );
}

/* ─── Icons ─── */
function HomeIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  );
}
function ModelsIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  );
}
function HistoryIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
function SettingsIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}
function HelpIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
