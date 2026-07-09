use std::fs;
use std::io::Write;

use serde::Serialize;

use super::media::media_info_for_path;
use super::path::{assert_readable, assert_writable, resolve_input_path, to_display_path};

fn to_absolute_path(abs: &std::path::Path) -> String {
    abs.to_string_lossy().replace('\\', "/").to_string()
}

const DEFAULT_SOFT_LIMIT: u64 = 2 * 1024 * 1024;
const HARD_LIMIT: u64 = 10 * 1024 * 1024;

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct FilePayload {
    pub path: String,
    pub absolute_path: String,
    pub content: String,
    pub encoding: String,
    pub mime_type: Option<String>,
    pub truncated: bool,
    pub size: u64,
}

pub fn read_file(path: &str, max_bytes: Option<u64>) -> Result<FilePayload, String> {
    let resolved = resolve_input_path(path)?;
    assert_readable(&resolved)?;

    if resolved.is_dir() {
        return Err(format!("{} is a directory", to_display_path(&resolved)));
    }

    let metadata = fs::metadata(&resolved)
        .map_err(|e| format!("Failed to stat {}: {e}", to_display_path(&resolved)))?;
    let size = metadata.len();
    let absolute_path = to_absolute_path(&resolved);

    if let Some(media) = media_info_for_path(&resolved) {
        if size > media.max_bytes {
            return Ok(FilePayload {
                path: to_display_path(&resolved),
                absolute_path,
                content: String::new(),
                encoding: "too_large".to_string(),
                mime_type: Some(media.mime),
                truncated: true,
                size,
            });
        }
        return Ok(FilePayload {
            path: to_display_path(&resolved),
            absolute_path,
            content: String::new(),
            encoding: media.kind,
            mime_type: Some(media.mime),
            truncated: false,
            size,
        });
    }

    let limit = max_bytes.unwrap_or(DEFAULT_SOFT_LIMIT).min(HARD_LIMIT);

    if size > limit {
        return Ok(FilePayload {
            path: to_display_path(&resolved),
            absolute_path,
            content: String::new(),
            encoding: "too_large".to_string(),
            mime_type: None,
            truncated: true,
            size,
        });
    }

    let bytes = fs::read(&resolved)
        .map_err(|e| format!("Failed to read {}: {e}", to_display_path(&resolved)))?;

    if bytes.contains(&0) {
        return Ok(FilePayload {
            path: to_display_path(&resolved),
            absolute_path: absolute_path.clone(),
            content: String::new(),
            encoding: "binary".to_string(),
            mime_type: None,
            truncated: false,
            size,
        });
    }

    match String::from_utf8(bytes) {
        Ok(content) => Ok(FilePayload {
            path: to_display_path(&resolved),
            absolute_path,
            content,
            encoding: "utf8".to_string(),
            mime_type: None,
            truncated: false,
            size,
        }),
        Err(_) => Ok(FilePayload {
            path: to_display_path(&resolved),
            absolute_path,
            content: String::new(),
            encoding: "binary".to_string(),
            mime_type: None,
            truncated: false,
            size,
        }),
    }
}

pub fn write_file(path: &str, content: &str) -> Result<(), String> {
    let resolved = resolve_input_path(path)?;
    assert_writable(&resolved)?;

    let parent = resolved
        .parent()
        .ok_or_else(|| format!("Invalid path: {}", to_display_path(&resolved)))?;

    let temp_name = format!(
        ".wisp-tmp-{}",
        uuid::Uuid::new_v4().to_string().replace('-', "")
    );
    let temp_path = parent.join(&temp_name);

    {
        let mut file = fs::File::create(&temp_path)
            .map_err(|e| format!("Failed to write {}: {e}", to_display_path(&temp_path)))?;
        file.write_all(content.as_bytes())
            .map_err(|e| format!("Failed to write {}: {e}", to_display_path(&temp_path)))?;
        file.sync_all()
            .map_err(|e| format!("Failed to sync {}: {e}", to_display_path(&temp_path)))?;
    }

    fs::rename(&temp_path, &resolved).map_err(|e| {
        let _ = fs::remove_file(&temp_path);
        format!("Failed to save {}: {e}", to_display_path(&resolved))
    })?;

    Ok(())
}
