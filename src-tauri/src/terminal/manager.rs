use std::collections::HashMap;

use parking_lot::Mutex;
use tauri::ipc::Channel;
use uuid::Uuid;

use super::session::{PtyEvent, PtySession};

pub struct TerminalManager {
    sessions: Mutex<HashMap<String, PtySession>>,
}

impl TerminalManager {
    pub fn new() -> Self {
        Self {
            sessions: Mutex::new(HashMap::new()),
        }
    }

    pub fn spawn(
        &self,
        cwd: Option<String>,
        cols: u16,
        rows: u16,
        fish_autosuggestions: Option<bool>,
        fish_overlay_completions: Option<bool>,
        shell: Option<String>,
        env: Option<HashMap<String, String>>,
        channel: Channel<PtyEvent>,
    ) -> Result<String, String> {
        let id = Uuid::new_v4().to_string();
        let session = PtySession::spawn(
            cwd,
            cols,
            rows,
            fish_autosuggestions,
            fish_overlay_completions,
            shell,
            env,
            channel,
        )?;
        self.sessions.lock().insert(id.clone(), session);
        Ok(id)
    }

    pub fn write(&self, id: &str, data: &[u8]) -> Result<(), String> {
        let sessions = self.sessions.lock();
        let session = sessions.get(id).ok_or_else(|| "Session not found".to_string())?;
        session.write(data)
    }

    pub fn resize(&self, id: &str, cols: u16, rows: u16) -> Result<(), String> {
        let sessions = self.sessions.lock();
        let session = sessions.get(id).ok_or_else(|| "Session not found".to_string())?;
        session.resize(cols, rows)
    }

    pub fn kill(&self, id: &str) -> Result<(), String> {
        let mut sessions = self.sessions.lock();
        if let Some(session) = sessions.remove(id) {
            session.kill()?;
        }
        Ok(())
    }
}
