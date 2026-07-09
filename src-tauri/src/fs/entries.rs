use std::fs;
use std::path::Path;

use serde::Serialize;

use super::path::{assert_readable, resolve_input_path, to_display_path};

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DirEntry {
    pub name: String,
    pub path: String,
    pub kind: String,
    pub size: u64,
    pub modified_ms: u64,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct FileStat {
    pub path: String,
    pub kind: String,
    pub size: u64,
    pub modified_ms: u64,
}

fn modified_ms(path: &Path) -> u64 {
    fs::metadata(path)
        .ok()
        .and_then(|m| m.modified().ok())
        .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}

pub fn stat_file(path: &str) -> Result<FileStat, String> {
    let resolved = resolve_input_path(path)?;
    assert_readable(&resolved)?;
    let metadata = fs::metadata(&resolved)
        .map_err(|e| format!("Failed to stat {}: {e}", to_display_path(&resolved)))?;
    let kind = if metadata.is_dir() { "dir" } else { "file" };
    Ok(FileStat {
        path: to_display_path(&resolved),
        kind: kind.to_string(),
        size: metadata.len(),
        modified_ms: modified_ms(&resolved),
    })
}

pub fn list_directory(path: &str, include_hidden: bool) -> Result<Vec<DirEntry>, String> {
    let resolved = resolve_input_path(path)?;
    assert_readable(&resolved)?;

    if !resolved.is_dir() {
        return Ok(vec![]);
    }

    let read_dir = fs::read_dir(&resolved)
        .map_err(|e| format!("Failed to read {}: {e}", to_display_path(&resolved)))?;

    let mut dirs = Vec::new();
    let mut files = Vec::new();

    for entry in read_dir.flatten() {
        let name = entry.file_name().to_string_lossy().to_string();
        if !include_hidden && name.starts_with('.') {
            continue;
        }

        let file_type = match entry.file_type() {
            Ok(ft) => ft,
            Err(_) => continue,
        };
        let entry_path = entry.path();
        let mut modified = 0u64;
        let mut size = 0u64;
        if let Ok(metadata) = fs::metadata(&entry_path) {
            size = metadata.len();
            modified = metadata
                .modified()
                .ok()
                .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                .map(|d| d.as_millis() as u64)
                .unwrap_or(0);
        }

        let item = DirEntry {
            name: name.clone(),
            path: to_display_path(&entry_path),
            kind: if file_type.is_dir() {
                "dir".to_string()
            } else {
                "file".to_string()
            },
            size,
            modified_ms: modified,
        };

        if file_type.is_dir() {
            dirs.push(item);
        } else {
            files.push(item);
        }
    }

    dirs.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    files.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    dirs.extend(files);
    Ok(dirs)
}

pub fn list_subfolders(path: &str) -> Result<Vec<super::FolderEntry>, String> {
    let entries = list_directory(path, false)?;
    Ok(entries
        .into_iter()
        .filter(|e| e.kind == "dir")
        .map(|e| super::FolderEntry {
            name: e.name,
            path: e.path,
        })
        .collect())
}
