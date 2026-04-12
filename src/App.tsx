import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { register, unregister } from "@tauri-apps/plugin-global-shortcut";
import { useAppStore } from "@/store/useAppStore";
import { loadSettings } from "@/hooks/useSettings";
import FloatingPill from "@/components/FloatingPill";
import Settings from "@/components/Settings";
import History from "@/components/History";
import Toast from "@/components/Toast";
import WelcomeScreen from "@/components/WelcomeScreen";

function useHashRoute() {
  const [hash, setHash] = useState(() => window.location.hash);
  useEffect(() => {
    const onHashChange = () => setHash(window.location.hash);
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);
  return hash;
}

function App() {
  const { 
    startDictation, 
    stopDictation, 
    hotkey, 
    recordingState, 
    loadHistory, 
    microphoneDevice,
    hasSeenWelcome 
  } = useAppStore();

  // Load persisted settings, history, and prep background mic on startup
  useEffect(() => {
    const init = async () => {
      await loadSettings();
      await loadHistory();
      await invoke("init_audio_stream", { deviceName: microphoneDevice });
      
      const { emit } = await import("@tauri-apps/api/event");
      emit("show-toast", {
        message: `Voxel is ready! Hold ${hotkey} to dictate.`,
        type: "info",
      }).catch(console.error);
    };
    init().catch(console.error);
  }, [microphoneDevice]);
  const hash = useHashRoute();

  useEffect(() => {
    let isHeld = false;
    let isMounted = true;

    const registerHotkey = async () => {
      // Small cooldown to ensure Tauri has released the previous binding
      await new Promise(r => setTimeout(r, 150));
      if (!isMounted) return;

      try {
        console.log(`[hotkey] Attempting to register: "${hotkey}"`);
        await register(hotkey, (event) => {
          if (event.state === "Pressed" && !isHeld) {
            isHeld = true;
            console.log("[hotkey] Triggered: Pressed");
            invoke("capture_focus").catch(console.error);
            startDictation().catch(console.error);
          } else if (event.state === "Released" && isHeld) {
            isHeld = false;
            console.log("[hotkey] Triggered: Released");
            // Delay stop to capture trailing speech on short inputs
            setTimeout(() => {
              stopDictation().catch(console.error);
            }, 600);
          }
        });
        console.log(`[hotkey] Successfully registered: "${hotkey}"`);
      } catch (err) {
        console.error("[hotkey] Failed to register:", err);
        const { emit } = await import("@tauri-apps/api/event");
        emit("show-toast", {
          message: `Hotkey "${hotkey}" is already in use by another app.`,
          type: "error",
        }).catch(console.error);
      }
    };

    registerHotkey();

    return () => {
      isMounted = false;
      console.log(`[hotkey] Unregistering: "${hotkey}"`);
      unregister(hotkey).catch(console.error);
    };
  }, [hotkey, startDictation, stopDictation]);

  if (hash === "#/settings") {
    return (
      <>
        <Toast />
        <Settings />
      </>
    );
  }

  if (hash === "#/history") {
    return <History />;
  }

  if (hash === "#/pill") {
    return <FloatingPill />;
  }

  return (
    <div>
      {!hasSeenWelcome && <WelcomeScreen />}
      <FloatingPill />
      {import.meta.env.DEV && (
        <div style={{ position: "fixed", top: 8, left: 8, color: "#666", fontSize: 11 }}>
          state: {recordingState}
        </div>
      )}
    </div>
  );
}

export default App;
