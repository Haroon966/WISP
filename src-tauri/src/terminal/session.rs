use std::io::{Read, Write};
use std::sync::Arc;

use parking_lot::Mutex;
use portable_pty::{native_pty_system, ChildKiller, MasterPty, PtySize};
use tauri::ipc::Channel;

use super::shell;

#[derive(Clone, serde::Serialize)]
#[serde(tag = "type", content = "data", rename_all = "camelCase")]
pub enum PtyEvent {
    Output(Vec<u8>),
    Exit { code: Option<i32> },
}

pub struct PtySession {
    writer: Arc<Mutex<Box<dyn Write + Send>>>,
    master: Arc<Mutex<Box<dyn MasterPty + Send>>>,
    killer: Mutex<Option<Box<dyn ChildKiller + Send + Sync>>>,
}

impl PtySession {
    pub fn spawn(
        cwd: Option<String>,
        cols: u16,
        rows: u16,
        channel: Channel<PtyEvent>,
    ) -> Result<Self, String> {
        let pty_system = native_pty_system();
        let pair = pty_system
            .openpty(PtySize {
                rows,
                cols,
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(|e| e.to_string())?;

        let cwd_path = cwd.as_deref().map(std::path::Path::new);
        let cmd = shell::build_shell_command(cwd_path);
        let mut child = pair
            .slave
            .spawn_command(cmd)
            .map_err(|e| e.to_string())?;

        let killer = child.clone_killer();
        let mut reader = pair
            .master
            .try_clone_reader()
            .map_err(|e| e.to_string())?;
        let writer = pair.master.take_writer().map_err(|e| e.to_string())?;
        let master = pair.master;

        let event_channel = channel.clone();
        std::thread::spawn(move || {
            let mut buf = [0u8; 4096];
            loop {
                match reader.read(&mut buf) {
                    Ok(0) => break,
                    Ok(n) => {
                        let _ = event_channel.send(PtyEvent::Output(buf[..n].to_vec()));
                    }
                    Err(_) => break,
                }
            }
        });

        let wait_channel = channel;
        std::thread::spawn(move || {
            let code = child.wait().ok().map(|s| s.exit_code() as i32);
            let _ = wait_channel.send(PtyEvent::Exit { code });
        });

        Ok(Self {
            writer: Arc::new(Mutex::new(writer)),
            master: Arc::new(Mutex::new(master)),
            killer: Mutex::new(Some(killer)),
        })
    }

    pub fn write(&self, data: &[u8]) -> Result<(), String> {
        let mut writer = self.writer.lock();
        writer.write_all(data).map_err(|e| e.to_string())?;
        writer.flush().map_err(|e| e.to_string())
    }

    pub fn resize(&self, cols: u16, rows: u16) -> Result<(), String> {
        let master = self.master.lock();
        master
            .resize(PtySize {
                rows,
                cols,
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(|e| e.to_string())
    }

    pub fn kill(&self) -> Result<(), String> {
        if let Some(mut killer) = self.killer.lock().take() {
            killer.kill().map_err(|e| e.to_string())?;
        }
        Ok(())
    }
}
