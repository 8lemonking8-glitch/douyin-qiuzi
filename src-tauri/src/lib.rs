mod logging;
// Reused verbatim from the MIT-licensed Dycast Desktop submodule.
#[path = "../../vendor/dycast-desktop/src-tauri/src/live_info.rs"]
mod live_info;
#[path = "../../vendor/dycast-desktop/src-tauri/src/ws_relay.rs"]
mod ws_relay;

use serde::Serialize;
use std::net::TcpListener;
use std::sync::{Arc, atomic::{AtomicUsize, Ordering}};
use std::thread;
use regex::Regex;
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

/// Expands a user-copied Douyin share link locally and returns the numeric live room id.
/// Only douyin.com URLs are accepted; the original share text is never persisted or logged.
#[tauri::command]
async fn resolve_room_number(input: String) -> Result<String, String> {
    let url_text = input.split_whitespace().find(|part| part.starts_with("http"))
        .ok_or("未找到直播间链接。")?;
    let parsed = url::Url::parse(url_text).map_err(|_| "直播间链接格式无效。")?;
    let host = parsed.host_str().unwrap_or_default();
    if !host.ends_with("douyin.com") { return Err("只支持抖音直播间链接。".to_string()); }
    let room_pattern = Regex::new(r"/(?:douyin/webcast/reflow/)?([0-9]{5,})").expect("valid room regex");
    if let Some(captures) = room_pattern.captures(parsed.path()) {
        return Ok(captures[1].to_string());
    }
    let client = reqwest::Client::builder()
        .redirect(reqwest::redirect::Policy::limited(8))
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/134 Safari/537.36")
        .build().map_err(|_| "无法创建链接解析请求。")?;
    let response = client.get(parsed).send().await.map_err(|_| "无法解析分享短链，请检查网络后重试。")?;
    let final_url = response.url();
    let final_host = final_url.host_str().unwrap_or_default();
    if !(final_host.ends_with("douyin.com") || final_host.ends_with("amemv.com")) { return Err("短链没有跳转到抖音直播间。".to_string()); }
    room_pattern.captures(final_url.path()).map(|captures| captures[1].to_string())
        .ok_or_else(|| "未能从分享链接识别直播间号。".to_string())
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
            set_overlay_always_on_top
            ,
            resolve_room_number,
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
