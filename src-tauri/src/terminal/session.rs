use std::collections::HashMap;
use std::io::{Read, Write};
use std::sync::Arc;
use std::time::{Duration, Instant};

use parking_lot::Mutex;
use portable_pty::{native_pty_system, ChildKiller, MasterPty, PtySize};
use tauri::ipc::Channel;

use super::shell::{self, ShellOptions};

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
        fish_autosuggestions: Option<bool>,
        shell: Option<String>,
        env: Option<HashMap<String, String>>,
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
        let opts = ShellOptions::from_spawn(fish_autosuggestions);
        let extra_env = env.unwrap_or_default();
        let cmd = shell::build_shell_command(
            cwd_path,
            &opts,
            shell.as_deref(),
            &extra_env,
        );
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
            let mut pending = Vec::new();
            loop {
                match reader.read(&mut buf) {
                    Ok(0) => {
                        if !pending.is_empty() {
                            let _ = event_channel.send(PtyEvent::Output(std::mem::take(&mut pending)));
                        }
                        break;
                    }
                    Ok(n) => {
                        pending.extend_from_slice(&buf[..n]);
                        let coalesce_start = Instant::now();
                        while coalesce_start.elapsed() < Duration::from_millis(16)
                            && pending.len() < 65536
                        {
                            std::thread::sleep(Duration::from_millis(2));
                            match reader.read(&mut buf) {
                                Ok(0) => break,
                                Ok(m) => pending.extend_from_slice(&buf[..m]),
                                Err(_) => break,
                            }
                        }
                        if !pending.is_empty() {
                            let _ = event_channel.send(PtyEvent::Output(std::mem::take(&mut pending)));
                        }
                    }
                    Err(_) => {
                        if !pending.is_empty() {
                            let _ = event_channel.send(PtyEvent::Output(std::mem::take(&mut pending)));
                        }
                        break;
                    }
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
        writer.write_all(data).map_err(|e| e.to_string())
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
