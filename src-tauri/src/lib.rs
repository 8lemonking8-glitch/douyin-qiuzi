mod logging;

// Official Dycast Desktop runtime modules. Kept as a pinned Git submodule so
// this application does not maintain its own Douyin protocol implementation.
#[path = "../../vendor/dycast-desktop/src-tauri/src/live_info.rs"]
mod live_info;
#[path = "../../vendor/dycast-desktop/src-tauri/src/ws_relay.rs"]
mod ws_relay;

use std::sync::Arc;
use tauri::{AppHandle, Emitter, Manager, State};

/// The latest snapshot survives Overlay startup timing and is delivered to the
/// dedicated Overlay window with a native, targeted event.
struct OverlayState(std::sync::Mutex<Option<serde_json::Value>>);

#[tauri::command]
fn sync_overlay_state(
    app: AppHandle,
    overlay_state: State<'_, OverlayState>,
    state: serde_json::Value,
) -> Result<(), String> {
    *overlay_state
        .0
        .lock()
        .map_err(|_| "Overlay state lock failed")? = Some(state.clone());
    app.emit_to("overlay", "quiz-state", state)
        .map_err(|error| error.to_string())
}

#[tauri::command]
fn get_overlay_state(
    overlay_state: State<'_, OverlayState>,
) -> Result<Option<serde_json::Value>, String> {
    overlay_state
        .0
        .lock()
        .map(|state| state.clone())
        .map_err(|_| "Overlay state lock failed".to_string())
}

#[tauri::command]
fn show_overlay(app: AppHandle) -> Result<(), String> {
    let window = app.get_webview_window("overlay").ok_or("Overlay 窗口不存在")?;
    window.show().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn hide_overlay(app: AppHandle) -> Result<(), String> {
    let window = app.get_webview_window("overlay").ok_or("Overlay 窗口不存在")?;
    window.hide().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn set_overlay_clickthrough(app: AppHandle, enabled: bool) -> Result<(), String> {
    let window = app.get_webview_window("overlay").ok_or("Overlay 窗口不存在")?;
    window.set_ignore_cursor_events(enabled).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn start_overlay_dragging(app: AppHandle) -> Result<(), String> {
    let window = app.get_webview_window("overlay").ok_or("Overlay 窗口不存在")?;
    window.start_dragging().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn set_overlay_always_on_top(app: AppHandle, enabled: bool) -> Result<(), String> {
    let window = app.get_webview_window("overlay").ok_or("Overlay 窗口不存在")?;
    window.set_always_on_top(enabled).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn set_overlay_offscreen(app: AppHandle, offscreen: bool) -> Result<(), String> {
    let window = app.get_webview_window("overlay").ok_or("Overlay 窗口不存在")?;
    if offscreen {
        window.set_position(tauri::Position::Physical(tauri::PhysicalPosition::new(-10000, -10000))).map_err(|e| e.to_string())?;
    } else {
        window.center().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn set_overlay_orientation(app: AppHandle, portrait: bool) -> Result<(), String> {
    let window = app.get_webview_window("overlay").ok_or("Overlay 窗口不存在")?;
    let size = if portrait {
        tauri::Size::Logical(tauri::LogicalSize::new(720.0, 1280.0))
    } else {
        tauri::Size::Logical(tauri::LogicalSize::new(1280.0, 720.0))
    };
    window.set_size(size).map_err(|e| e.to_string())?;
    Ok(())
}

pub fn run() {
    tauri::Builder::default()
        .manage(Arc::new(live_info::HttpState::new()))
        .manage(Arc::new(std::sync::Mutex::new(ws_relay::WsState::new())))
        .manage(OverlayState(std::sync::Mutex::new(None)))
        .setup(|app| {
            logging::write("INFO", "Application started");
            if let Some(overlay) = app.get_webview_window("overlay") {
                let _ = overlay.set_ignore_cursor_events(true);
                // 离屏显示：移到屏幕外后保持可见，主播桌面上看不到，但直播伴侣可采集
                let _ = overlay.set_position(tauri::Position::Physical(tauri::PhysicalPosition::new(-10000, -10000)));
                let _ = overlay.show();
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            sync_overlay_state,
            get_overlay_state,
            show_overlay,
            hide_overlay,
            set_overlay_clickthrough,
            start_overlay_dragging,
            set_overlay_always_on_top,
            set_overlay_offscreen,
            set_overlay_orientation,
            live_info::fetch_binary,
            live_info::fetch_head,
            live_info::fetch_live_html,
            live_info::fetch_live_info,
            ws_relay::ws_connect,
            ws_relay::ws_send,
            ws_relay::ws_send_text,
            ws_relay::ws_close
        ])
        .run(tauri::generate_context!())
        .expect("error while running Tauri application");
}
