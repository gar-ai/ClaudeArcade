use crate::pty::PtyManager;
use std::sync::Mutex;
use tauri::{AppHandle, State};

pub struct PtyState(pub Mutex<PtyManager>);

#[tauri::command]
pub fn pty_spawn(
    app_handle: AppHandle,
    state: State<'_, PtyState>,
    cols: u16,
    rows: u16,
    cwd: Option<String>,
) -> Result<String, String> {
    let manager = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    manager.spawn(app_handle, cols, rows, cwd)
}

#[tauri::command]
pub fn pty_write(state: State<'_, PtyState>, id: String, data: String) -> Result<(), String> {
    let manager = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    manager.write(&id, &data)
}

#[tauri::command]
pub fn pty_resize(
    state: State<'_, PtyState>,
    id: String,
    cols: u16,
    rows: u16,
) -> Result<(), String> {
    let manager = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    manager.resize(&id, cols, rows)
}

#[tauri::command]
pub fn pty_kill(state: State<'_, PtyState>, id: String) -> Result<(), String> {
    let manager = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    manager.kill(&id)
}
