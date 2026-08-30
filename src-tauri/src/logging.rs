use std::fs::{create_dir_all, OpenOptions};
use std::io::Write;
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};

/// Writes operational diagnostics only; message content and user data are never logged.
pub fn write(level: &str, message: &str) {
    let mut dir = std::env::var_os("LOCALAPPDATA").map(PathBuf::from)
        .unwrap_or_else(std::env::temp_dir);
    dir.push("Douyin Live Quiz Assistant");
    dir.push("logs");
    if create_dir_all(&dir).is_err() { return; }
    let timestamp = SystemTime::now().duration_since(UNIX_EPOCH).map(|time| time.as_secs()).unwrap_or(0);
    if let Ok(mut file) = OpenOptions::new().create(true).append(true).open(dir.join("app.log")) {
        let _ = writeln!(file, "[{timestamp}] [{level}] {message}");
    }
}
