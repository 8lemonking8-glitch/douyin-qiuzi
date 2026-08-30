mod logging;
// Official Dycast Desktop runtime modules. Kept as a pinned Git submodule so
// this application does not maintain its own Douyin protocol implementation.
#[path = "../../vendor/dycast-desktop/src-tauri/src/live_info.rs"]
mod live_info;
#[path = "../../vendor/dycast-desktop/src-tauri/src/ws_relay.rs"]
mod ws_relay;

use serde::Serialize;
use std::net::TcpListener;
use std::sync::{Arc, atomic::{AtomicUsize, Ordering}};
use std::thread;
use tauri::{AppHandle, Emitter, Manager};
use tungstenite::Message;

const DYCAST_ADDR: &str = "127.0.0.1:17891";

#[derive(Clone, Serialize)]
struct DycastStatus {
    connected: usize,
    address: &'static str,
    error: Option<String>,
}

fn emit_status(app: &AppHandle, connected: usize, error: Option<String>) {
    if let Some(ref detail) = error {
        logging::write("ERROR", detail);
    }
    let _ = app.emit("dycast-status", DycastStatus {
        connected,
        address: DYCAST_ADDR,
        error,
    });
}

fn start_dycast_server(app: AppHandle) {
    thread::spawn(move || {
        let listener = match TcpListener::bind(DYCAST_ADDR) {
            Ok(listener) => listener,
            Err(err) => {
                emit_status(&app, 0, Some(format!("无法监听 {}: {}", DYCAST_ADDR, err)));
                return;
            }
        };

        logging::write("INFO", "Dycast WebSocket listener started on 127.0.0.1:17891");

        let connections = Arc::new(AtomicUsize::new(0));
        emit_status(&app, 0, None);

        for stream in listener.incoming() {
            let stream = match stream {
                Ok(stream) => stream,
                Err(err) => {
                    emit_status(&app, connections.load(Ordering::SeqCst), Some(err.to_string()));
                    continue;
                }
            };

            let app = app.clone();
            let connections = connections.clone();

            thread::spawn(move || {
                let mut socket = match tungstenite::accept(stream) {
                    Ok(socket) => socket,
                    Err(err) => {
                        let count = connections.load(Ordering::SeqCst);
                        emit_status(&app, count, Some(format!("WebSocket 握手失败: {}", err)));
                        return;
                    }
                };

                let count = connections.fetch_add(1, Ordering::SeqCst) + 1;
                emit_status(&app, count, None);

                loop {
                    match socket.read() {
                        Ok(Message::Text(text)) => {
                            let _ = app.emit("dycast-payload", text.to_string());
                        }
                        Ok(Message::Binary(bytes)) => {
                            if let Ok(text) = String::from_utf8(bytes.to_vec()) {
                                let _ = app.emit("dycast-payload", text);
                            }
                        }
                        Ok(Message::Ping(payload)) => {
                            let _ = socket.send(Message::Pong(payload));
                        }
                        Ok(Message::Close(frame)) => {
                            let _ = socket.send(Message::Close(frame));
                            let _ = socket.flush();
                            break;
                        }
                        Ok(_) => {}
                        Err(_) => break,
                    }
                }

                let count = connections.fetch_sub(1, Ordering::SeqCst).saturating_sub(1);
                emit_status(&app, count, None);
            });
        }
    });
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

pub fn run() {
    tauri::Builder::default()
        .manage(Arc::new(live_info::HttpState::new()))
        .manage(Arc::new(std::sync::Mutex::new(ws_relay::WsState::new())))
        .setup(|app| {
            logging::write("INFO", "Application started");
            if let Some(overlay) = app.get_webview_window("overlay") {
                let _ = overlay.set_ignore_cursor_events(true);
            }
            start_dycast_server(app.handle().clone());
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            show_overlay,
            hide_overlay,
            set_overlay_clickthrough,
            start_overlay_dragging,
            set_overlay_always_on_top,
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
