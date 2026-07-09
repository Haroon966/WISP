use std::collections::HashMap;

use tauri::ipc::Channel;
use tauri::State;

use crate::terminal::{PtyEvent, TerminalManager};

#[tauri::command]
pub fn spawn_terminal(
    cwd: Option<String>,
    cols: u16,
    rows: u16,
    fish_autosuggestions: Option<bool>,
    fish_overlay_completions: Option<bool>,
    shell: Option<String>,
    env: Option<HashMap<String, String>>,
    on_event: Channel<PtyEvent>,
    manager: State<'_, TerminalManager>,
) -> Result<String, String> {
    manager.spawn(
        cwd,
        cols,
        rows,
        fish_autosuggestions,
        fish_overlay_completions,
        shell,
        env,
        on_event,
    )
}

#[tauri::command]
pub fn write_terminal(id: String, data: String, manager: State<'_, TerminalManager>) -> Result<(), String> {
    manager.write(&id, data.as_bytes())
}

#[tauri::command]
pub fn resize_terminal(
    id: String,
    cols: u16,
    rows: u16,
    manager: State<'_, TerminalManager>,
) -> Result<(), String> {
    manager.resize(&id, cols, rows)
}

#[tauri::command]
pub fn kill_terminal(id: String, manager: State<'_, TerminalManager>) -> Result<(), String> {
    manager.kill(&id)
}
