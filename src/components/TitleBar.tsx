import { getCurrentWindow } from "@tauri-apps/api/window";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";

export default function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false);

  // Track maximized state so the icon can switch between maximize/restore
  useEffect(() => {
    const win = getCurrentWindow();
    win.isMaximized().then(setIsMaximized).catch(console.error);

    const unlisten = win.onResized(() => {
      win.isMaximized().then(setIsMaximized).catch(console.error);
    });

    return () => {
      unlisten.then(fn => fn()).catch(console.error);
    };
  }, []);

  const handleMinimize = async () => {
    try {
      await getCurrentWindow().minimize();
    } catch (e) {
      console.error("minimize failed:", e);
    }
  };

  const handleMaximize = async () => {
    try {
      const win = getCurrentWindow();
      if (isMaximized) {
        await win.unmaximize();
      } else {
        await win.maximize();
      }
    } catch (e) {
      console.error("maximize failed:", e);
    }
  };

  const handleClose = async () => {
    try {
      await getCurrentWindow().close();
    } catch (e) {
      console.error("close failed:", e);
    }
  };

  return (
    <div
      data-tauri-drag-region
      className="flex items-center justify-between h-10 px-4 shrink-0 select-none"
    >
      {/* Left: Logo + App name */}
      <div className="flex items-center gap-2 pointer-events-none">
        <div className="w-5 h-5 rounded-lg bg-signal flex items-center justify-center shadow-[0_0_12px_oklch(0.68_0.12_35_/_0.3)]">
          <span className="text-[10px] text-white font-headline font-black italic">V</span>
        </div>
        <span className="text-[10px] font-black font-headline uppercase tracking-wider text-on-surface/50">
          Voxel Dashboard
        </span>
      </div>

      {/* Right: Window controls */}
      <div className="flex items-center gap-1 pointer-events-auto">
        {/* Minimize */}
        <motion.button
          whileHover={{ backgroundColor: "var(--color-on-surface-low, rgba(255,255,255,0.03))" }}
          whileTap={{ scale: 0.95 }}
          onClick={handleMinimize}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface/40 hover:text-on-surface/80 transition-colors"
          title="Minimize"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 14 14">
            <path d="M2 7h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </motion.button>

        {/* Maximize / Restore */}
        <motion.button
          whileHover={{ backgroundColor: "rgba(255,255,255,0.07)" }}
          whileTap={{ scale: 0.9 }}
          onClick={handleMaximize}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 hover:text-zinc-200 transition-colors"
          title={isMaximized ? "Restore" : "Maximize"}
        >
          {isMaximized ? (
            /* Restore icon: two overlapping squares */
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 14 14">
              <rect x="4" y="1" width="9" height="9" rx="1" stroke="currentColor" strokeWidth="1.5" />
              <path d="M1 5v7a1 1 0 001 1h7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          ) : (
            /* Maximize icon: single square */
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 14 14">
              <rect x="2" y="2" width="10" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          )}
        </motion.button>

        {/* Close */}
        <motion.button
          whileHover={{ backgroundColor: "rgba(220,38,38,0.18)" }}
          whileTap={{ scale: 0.9 }}
          onClick={handleClose}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 hover:text-red-400 transition-colors"
          title="Close"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 14 14">
            <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </motion.button>
      </div>
    </div>
  );
}
