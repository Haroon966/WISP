use std::fs;
use std::path::Path;

use serde::Serialize;

use super::path::{assert_readable, resolve_input_path, to_display_path};

const IMAGE_EXTS: &[&str] = &[
    "png", "jpg", "jpeg", "gif", "webp", "bmp", "ico", "svg", "avif", "heic", "heif",
];

const VIDEO_EXTS: &[&str] = &[
    "mp4", "webm", "ogg", "ogv", "mov", "mkv", "avi", "m4v",
];

pub const IMAGE_MAX_BYTES: u64 = 50 * 1024 * 1024;
pub const VIDEO_MAX_BYTES: u64 = 500 * 1024 * 1024;

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct MediaPreviewPayload {
    pub path: String,
    pub absolute_path: String,
    pub encoding: String,
    pub mime_type: String,
    pub size: u64,
    pub modified_ms: u64,
}

pub struct MediaInfo {
    pub kind: String,
    pub mime: String,
    pub max_bytes: u64,
}

pub fn media_info_for_path(path: &Path) -> Option<MediaInfo> {
    let ext = path.extension()?.to_str()?.to_lowercase();
    if IMAGE_EXTS.contains(&ext.as_str()) {
        return Some(MediaInfo {
            kind: "image".to_string(),
            mime: mime_for_ext(&ext),
            max_bytes: IMAGE_MAX_BYTES,
        });
    }
    if VIDEO_EXTS.contains(&ext.as_str()) {
        return Some(MediaInfo {
            kind: "video".to_string(),
            mime: mime_for_ext(&ext),
            max_bytes: VIDEO_MAX_BYTES,
        });
    }
    None
}

pub fn prepare_media_preview(path: &str) -> Result<MediaPreviewPayload, String> {
    let resolved = resolve_input_path(path)?;
    assert_readable(&resolved)?;

    if resolved.is_dir() {
        return Err(format!("{} is a directory", to_display_path(&resolved)));
    }

    let media = media_info_for_path(&resolved)
        .ok_or_else(|| format!("{} is not a media file", to_display_path(&resolved)))?;

    let metadata = fs::metadata(&resolved)
        .map_err(|e| format!("Failed to stat {}: {e}", to_display_path(&resolved)))?;
    let size = metadata.len();
    let modified_ms = metadata
        .modified()
        .ok()
        .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0);

    let absolute_path = resolved.to_string_lossy().replace('\\', "/");
    let display = to_display_path(&resolved);

    if size > media.max_bytes {
        return Ok(MediaPreviewPayload {
            path: display,
            absolute_path,
            encoding: "too_large".to_string(),
            mime_type: media.mime,
            size,
            modified_ms,
        });
    }

    Ok(MediaPreviewPayload {
        path: display,
        absolute_path,
        encoding: media.kind,
        mime_type: media.mime,
        size,
        modified_ms,
    })
}

fn mime_for_ext(ext: &str) -> String {
    match ext {
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "gif" => "image/gif",
        "webp" => "image/webp",
        "bmp" => "image/bmp",
        "ico" => "image/x-icon",
        "svg" => "image/svg+xml",
        "avif" => "image/avif",
        "heic" => "image/heic",
        "heif" => "image/heif",
        "mp4" => "video/mp4",
        "webm" => "video/webm",
        "ogg" | "ogv" => "video/ogg",
        "mov" => "video/quicktime",
        "mkv" => "video/x-matroska",
        "avi" => "video/x-msvideo",
        "m4v" => "video/x-m4v",
        _ => "application/octet-stream",
    }
    .to_string()
}
