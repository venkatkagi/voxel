import { useEffect, useState } from "react";

interface ToastData {
  message: string;
  type: "error" | "info";
}

export default function Toast() {
  const [toast, setToast] = useState<ToastData | null>(null);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let timer: ReturnType<typeof setTimeout>;

    import("@tauri-apps/api/event").then(({ listen }) => {
      listen<ToastData>("show-toast", (event) => {
        setToast(event.payload);
        clearTimeout(timer);
        timer = setTimeout(() => setToast(null), 3500);
      }).then((fn) => {
        unlisten = fn;
      });
    });

    return () => {
      unlisten?.();
      clearTimeout(timer);
    };
  }, []);

  if (!toast) return null;

  return (
    <div
      className={`fixed top-4 left-1/2 -translate-x-1/2 z-[9999] pointer-events-none
        px-5 py-2.5 rounded-full text-[13px] font-body font-medium
        backdrop-blur-3xl border shadow-[0_8px_32px_rgba(0,0,0,0.6)]
        max-w-sm text-center whitespace-pre-line select-none
        ${toast.type === "error"
          ? "bg-signal/90 text-white border-signal/30"
          : "bg-surface-container-highest/90 text-on-surface border-white/10"
        }`}
    >
      {toast.message}
    </div>
  );
}
