import { useEffect, useState, useRef } from "react";
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

  // --- One-time startup: load settings from disk, then init the mic stream ---
  useEffect(() => {
    const init = async () => {
      await loadSettings();
      await loadHistory();
      // Read mic device AFTER loadSettings so we get the persisted value
      const { microphoneDevice: savedMic } = useAppStore.getState();
      await invoke("init_audio_stream", { deviceName: savedMic });

      const { emit } = await import("@tauri-apps/api/event");
      emit("show-toast", {
        message: `Voxel is ready! Hold ${hotkey} to dictate.`,
        type: "info",
      }).catch(console.error);
    };
    init().catch(console.error);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally run once on mount

  // --- Re-init mic stream when user changes microphone in settings ---
  // (skip initial mount — handled by the startup effect above)
  const isMicFirstRender = useRef(true);
  useEffect(() => {
    if (isMicFirstRender.current) { isMicFirstRender.current = false; return; }
    invoke("init_audio_stream", { deviceName: microphoneDevice }).catch(console.error);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [microphoneDevice]); // only fires when mic selection actually changes

  // --- Cross-window settings sync ---
  // The settings window is a separate webview with its own JS context.
  // When the user saves an API key there, it persists to disk but the main
  // window's Zustand store doesn't know. Listen for the 'settings-changed'
  // event emitted by the Settings window and reload from disk.
  useEffect(() => {
    let unlisten: (() => void) | null = null;
    import("@tauri-apps/api/event").then(({ listen }) => {
      listen("settings-changed", async () => {
        await loadSettings();
      }).then(fn => { unlisten = fn; });
    });
    return () => { unlisten?.(); };
  }, []);
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
