mod audio;

use enigo::{Direction, Enigo, Key, Keyboard, Settings};
use std::sync::Mutex;
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, TrayIconBuilder, TrayIconEvent},
    AppHandle, Manager,
};

// Stores the HWND of the window that was focused before recording started
static PREV_HWND: Mutex<isize> = Mutex::new(0);

#[tauri::command]
fn capture_focus() {
    #[cfg(target_os = "windows")]
    {
        let hwnd = unsafe { winapi::um::winuser::GetForegroundWindow() } as isize;
        *PREV_HWND.lock().unwrap() = hwnd;
    }
}

#[tauri::command]
fn show_pill(app: AppHandle) {
    if let Some(win) = app.get_webview_window("floating-pill") {
        if let Ok(Some(monitor)) = win.primary_monitor() {
            if let Ok(win_size) = win.outer_size() {
                let screen = monitor.size();
                let scale = monitor.scale_factor();
                let x = (screen.width as i32 - win_size.width as i32) / 2;
                let y = screen.height as i32
                    - win_size.height as i32
                    - (60.0 * scale) as i32;
                let _ = win.set_position(tauri::PhysicalPosition::new(x, y));
            }
        }
        let _ = win.show();
    }
    
    // Crucial: immediately hand focus back so typing fields don't accidentally lose target to the visual pill!
    #[cfg(target_os = "windows")]
    {
        let hwnd_val = *PREV_HWND.lock().unwrap();
        if hwnd_val != 0 {
            unsafe { winapi::um::winuser::SetForegroundWindow(hwnd_val as winapi::shared::windef::HWND); }
        }
    }
}

#[tauri::command]
fn simulate_paste() -> Result<(), String> {
    // Restore focus to the window that was active before recording
    #[cfg(target_os = "windows")]
    {
        let hwnd_val = *PREV_HWND.lock().unwrap();
        if hwnd_val != 0 {
            unsafe {
                winapi::um::winuser::SetForegroundWindow(
                    hwnd_val as winapi::shared::windef::HWND,
                );
            }
            // Give Windows time to actually switch focus back
            std::thread::sleep(std::time::Duration::from_millis(300));
        }
    }

    let mut enigo = Enigo::new(&Settings::default())
        .map_err(|e| format!("Input simulator error: {e}"))?;
    std::thread::sleep(std::time::Duration::from_millis(50));
    enigo
        .key(Key::Control, Direction::Press)
        .map_err(|e| format!("{e}"))?;
    std::thread::sleep(std::time::Duration::from_millis(50));
    enigo
        .key(Key::Unicode('v'), Direction::Click)
        .map_err(|e| format!("{e}"))?;
    std::thread::sleep(std::time::Duration::from_millis(50));
    enigo
        .key(Key::Control, Direction::Release)
        .map_err(|e| format!("{e}"))?;
    Ok(())
}

#[tauri::command]
fn hide_pill(app: AppHandle) {
    if let Some(win) = app.get_webview_window("floating-pill") {
        let _ = win.hide();
    }
    // Prevent unmounting borderless overlapping windows from dropping OS Z-order randomly into Desktop
    #[cfg(target_os = "windows")]
    {
        let hwnd_val = *PREV_HWND.lock().unwrap();
        if hwnd_val != 0 {
            unsafe { winapi::um::winuser::SetForegroundWindow(hwnd_val as winapi::shared::windef::HWND); }
        }
    }
}

#[tauri::command]
fn open_settings(app: AppHandle) {
    if let Some(win) = app.get_webview_window("settings") {
        let _ = win.show();
        let _ = win.set_focus();
    }
}

fn show_settings_window(app: &AppHandle) {
    if let Some(win) = app.get_webview_window("settings") {
        let _ = win.show();
        let _ = win.set_focus();
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec!["--minimized"]),
        ))
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_store::Builder::default().build())
        .setup(|app| {
            let quit_item = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let settings_item =
                MenuItem::with_id(app, "settings", "Open Settings", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&settings_item, &quit_item])?;

            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .tooltip("Wispr Clone")
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "quit" => {
                        app.exit(0);
                    }
                    "settings" => {
                        show_settings_window(app);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        ..
                    } = event
                    {
                        show_settings_window(tray.app_handle());
                    }
                })
                .build(app)?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            capture_focus,
            audio::init_audio_stream,
            audio::get_audio_chunk,
            audio::start_recording,
            audio::stop_recording,
            audio::get_microphones,
            show_pill,
            hide_pill,
            open_settings,
            simulate_paste,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
