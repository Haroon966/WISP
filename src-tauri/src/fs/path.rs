use std::fs;
use std::path::{Path, PathBuf};

use crate::terminal::shell;

pub fn to_display_path(abs: &Path) -> String {
    let home = dirs::home_dir().unwrap_or_default();
    if let Ok(rel) = abs.strip_prefix(&home) {
        if rel.as_os_str().is_empty() {
            return "~".to_string();
        }
        let rel_str = rel.to_string_lossy().replace('\\', "/");
        return format!("~/{}", rel_str);
    }
    abs.to_string_lossy().replace('\\', "/").to_string()
}

pub fn resolve_input_path(display_path: &str) -> Result<PathBuf, String> {
    let resolved = shell::resolve_cwd(Some(Path::new(display_path)));
    canonicalize_if_possible(&resolved)
}

fn canonicalize_if_possible(path: &Path) -> Result<PathBuf, String> {
    if path.exists() {
        fs::canonicalize(path).map_err(|e| format!("Failed to resolve {}: {e}", path.display()))
    } else if let Some(parent) = path.parent() {
        if parent.exists() {
            let parent_canon =
                fs::canonicalize(parent).map_err(|e| format!("Failed to resolve {}: {e}", parent.display()))?;
            let file_name = path
                .file_name()
                .ok_or_else(|| format!("Invalid path: {}", path.display()))?;
            Ok(parent_canon.join(file_name))
        } else {
            Ok(path.to_path_buf())
        }
    } else {
        Ok(path.to_path_buf())
    }
}

pub fn assert_readable(path: &Path) -> Result<(), String> {
    if !path.exists() {
        return Err(format!("Path does not exist: {}", to_display_path(path)));
    }
    if path.is_dir() {
        fs::read_dir(path).map_err(|e| format!("Cannot read directory {}: {e}", to_display_path(path)))?;
    } else {
        fs::File::open(path).map_err(|e| format!("Cannot read file {}: {e}", to_display_path(path)))?;
    }
    Ok(())
}

pub fn assert_writable(path: &Path) -> Result<(), String> {
    if path.is_dir() {
        return Err(format!(
            "Cannot write to directory: {}",
            to_display_path(path)
        ));
    }
    let parent = path
        .parent()
        .ok_or_else(|| format!("Invalid path: {}", to_display_path(path)))?;
    if !parent.is_dir() {
        return Err(format!(
            "Parent directory does not exist: {}",
            to_display_path(parent)
        ));
    }
    let test = parent.join(format!(".wisp-write-test-{}", uuid::Uuid::new_v4()));
    match fs::write(&test, b"") {
        Ok(()) => {
            let _ = fs::remove_file(&test);
            Ok(())
        }
        Err(e) => Err(format!(
            "Cannot write to {}: {e}",
            to_display_path(parent)
        )),
    }
}
