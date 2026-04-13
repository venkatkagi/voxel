import React from "react";
import { motion, AnimatePresence } from "framer-motion";

const SPRING: [number, number, number, number] = [0.32, 0.72, 0, 1];

export interface SelectOption {
  value: string;
  label: string;
  color?: string; // e.g. "oklch(0.60 0.22 280)"
}

interface SelectProps {
  value: string;
  onChange: (v: string) => void;
  options: SelectOption[];
  className?: string;
}

export function CustomSelect({ value, onChange, options, className = "w-48" }: SelectProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find((o) => o.value === value) || options[0];

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-2.5 bg-surface-container border border-on-surface/[0.08] rounded-xl px-3.5 py-2 text-[11px] font-medium text-on-surface/80 hover:bg-surface-container-high transition-all active:scale-[0.98] shadow-sm"
        style={{ transitionTimingFunction: "cubic-bezier(0.32,0.72,0,1)" }}
      >
        <div className="flex items-center gap-2 truncate">
          {selectedOption?.color && (
            <div 
              className="w-1.5 h-1.5 rounded-full shrink-0 shadow-[0_0_8px_var(--dot-color)]" 
              style={{ background: selectedOption.color, '--dot-color': selectedOption.color } as any} 
            />
          )}
          <span className="truncate">{selectedOption?.label}</span>
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.3, ease: SPRING }}
          className="text-on-surface/30 shrink-0"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </motion.div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -2 }}
            transition={{ duration: 0.2, ease: SPRING }}
            className="absolute z-50 top-full mt-1.5 w-full bg-surface-container-highest/95 backdrop-blur-2xl border border-on-surface/[0.08] rounded-xl shadow-[0_12px_40px_rgba(0,0,0,0.6)] overflow-hidden"
          >
            <div className="max-h-64 overflow-y-auto py-1 scrollbar-hide">
              {options.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-3.5 py-2.5 text-[11px] font-medium transition-all flex items-center gap-2.5
                    ${opt.value === value 
                      ? "bg-on-surface/[0.06] text-on-surface font-bold" 
                      : "text-on-surface/50 hover:bg-white/5 hover:text-on-surface"}`}
                >
                  {opt.color && (
                    <div 
                      className="w-1.5 h-1.5 rounded-full shrink-0" 
                      style={{ background: opt.color }} 
                    />
                  )}
                  {opt.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
