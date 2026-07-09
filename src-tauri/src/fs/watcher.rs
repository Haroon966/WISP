use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::mpsc::{self, Receiver, RecvTimeoutError};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, Instant};

use notify::event::{EventKind, ModifyKind};
use notify::{Config, Event, RecommendedWatcher, RecursiveMode, Watcher};
use parking_lot::Mutex as ParkingMutex;
use serde::Serialize;
use tauri::{AppHandle, Emitter};
use uuid::Uuid;

use super::path::{resolve_input_path, to_display_path};

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct FsChangePayload {
    pub watch_id: String,
    pub paths: Vec<String>,
    pub kind: String,
}

struct WatchEntry {
    _handle: thread::JoinHandle<()>,
}

pub struct WatcherManager {
    watches: ParkingMutex<HashMap<String, WatchEntry>>,
}

impl WatcherManager {
    pub fn new() -> Self {
        Self {
            watches: ParkingMutex::new(HashMap::new()),
        }
    }

    pub fn watch(
        &self,
        app: AppHandle,
        path: &str,
    ) -> Result<String, String> {
        let resolved = resolve_input_path(path)?;
        if !resolved.is_dir() {
            return Err(format!(
                "Cannot watch non-directory: {}",
                to_display_path(&resolved)
            ));
        }

        let watch_id = Uuid::new_v4().to_string();
        let (tx, rx) = mpsc::channel();

        let mut watcher = RecommendedWatcher::new(
            move |res: Result<Event, notify::Error>| {
                if let Ok(event) = res {
                    let _ = tx.send(event);
                }
            },
            Config::default(),
        )
        .map_err(|e| format!("Failed to create watcher: {e}"))?;

        watcher
            .watch(&resolved, RecursiveMode::Recursive)
            .map_err(|e| format!("Failed to watch {}: {e}", to_display_path(&resolved)))?;

        let watcher = Arc::new(Mutex::new(watcher));
        let watch_id_clone = watch_id.clone();
        let root = resolved.clone();

        let handle = thread::spawn(move || {
            poll_events(app, watch_id_clone, root, watcher, rx);
        });

        self.watches.lock().insert(
            watch_id.clone(),
            WatchEntry { _handle: handle },
        );

        Ok(watch_id)
    }

    pub fn unwatch(&self, watch_id: &str) -> Result<(), String> {
        self.watches.lock().remove(watch_id);
        Ok(())
    }
}

fn poll_events(
    app: AppHandle,
    watch_id: String,
    root: PathBuf,
    watcher: Arc<Mutex<RecommendedWatcher>>,
    rx: Receiver<Event>,
) {
    let mut pending: HashMap<PathBuf, (String, Instant)> = HashMap::new();
    let debounce = Duration::from_millis(150);

    loop {
        if Arc::strong_count(&watcher) <= 1 {
            break;
        }

        match rx.recv_timeout(Duration::from_millis(50)) {
            Ok(event) => {
                let kind = event_kind_label(&event.kind);
                for path in event.paths {
                    if should_skip(&root, &path) {
                        continue;
                    }
                    pending.insert(path, (kind.clone(), Instant::now()));
                }
            }
            Err(RecvTimeoutError::Timeout) => {}
            Err(RecvTimeoutError::Disconnected) => break,
        }

        let now = Instant::now();
        let ready: Vec<(PathBuf, String)> = pending
            .iter()
            .filter(|(_, (_, t))| now.duration_since(*t) >= debounce)
            .map(|(p, (k, _))| (p.clone(), k.clone()))
            .collect();

        if !ready.is_empty() {
            let paths: Vec<String> = ready.iter().map(|(p, _)| to_display_path(p)).collect();
            let kind = ready
                .first()
                .map(|(_, k)| k.clone())
                .unwrap_or_else(|| "change".to_string());
            for (p, _) in &ready {
                pending.remove(p);
            }
            let _ = app.emit(
                "fs:change",
                FsChangePayload {
                    watch_id: watch_id.clone(),
                    paths,
                    kind,
                },
            );
        }
    }
}

fn should_skip(root: &Path, path: &Path) -> bool {
    let rel = match path.strip_prefix(root) {
        Ok(r) => r,
        Err(_) => return true,
    };
    for component in rel.components() {
        let name = component.as_os_str().to_string_lossy();
        if name == "node_modules"
            || name == ".git"
            || name == "target"
            || name == "dist"
            || name == "build"
        {
            return true;
        }
    }
    false
}

fn event_kind_label(kind: &EventKind) -> String {
    match kind {
        EventKind::Create(_) => "create".to_string(),
        EventKind::Modify(ModifyKind::Name(_)) => "rename".to_string(),
        EventKind::Modify(_) => "modify".to_string(),
        EventKind::Remove(_) => "remove".to_string(),
        _ => "change".to_string(),
    }
}