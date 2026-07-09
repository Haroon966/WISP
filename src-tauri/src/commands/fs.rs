use std::fs;
use std::path::{Path, PathBuf};

use serde::Serialize;
use serde_json::Value;

use crate::fs::{
    list_directory as fs_list_directory, list_subfolders as fs_list_subfolders,
    prepare_media_preview as fs_prepare_media_preview, read_file as fs_read_file,
    stat_file as fs_stat_file, write_file as fs_write_file, to_display_path, DirEntry,
    FilePayload, FileStat, FolderEntry, MediaPreviewPayload, WatcherManager,
};
use tauri::{AppHandle, State};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectTask {
    pub name: String,
    pub command: String,
    pub source: String,
}

fn resolve_cwd_path(cwd: &str) -> PathBuf {
    crate::terminal::shell::resolve_cwd(Some(Path::new(cwd)))
}

pub fn find_repo_root_from(path: &Path) -> Option<PathBuf> {
    let mut current = if path.is_dir() {
        path.to_path_buf()
    } else {
        path.parent()?.to_path_buf()
    };

    loop {
        if current.join(".git").exists() {
            return Some(current);
        }
        if !current.pop() {
            return None;
        }
    }
}

fn parse_package_json_scripts(dir: &Path) -> Vec<ProjectTask> {
    let path = dir.join("package.json");
    let content = match fs::read_to_string(&path) {
        Ok(c) => c,
        Err(_) => return vec![],
    };
    let json: Value = match serde_json::from_str(&content) {
        Ok(v) => v,
        Err(_) => return vec![],
    };
    let scripts = match json.get("scripts").and_then(|s| s.as_object()) {
        Some(s) => s,
        None => return vec![],
    };

    let mut tasks: Vec<ProjectTask> = scripts
        .iter()
        .map(|(name, _cmd)| ProjectTask {
            name: name.clone(),
            command: format!("npm run {name}"),
            source: "npm".to_string(),
        })
        .collect();
    tasks.sort_by(|a, b| a.name.cmp(&b.name));
    tasks
}

fn parse_makefile_targets(dir: &Path) -> Vec<ProjectTask> {
    let path = dir.join("Makefile");
    let content = match fs::read_to_string(&path) {
        Ok(c) => c,
        Err(_) => {
            let alt = dir.join("makefile");
            match fs::read_to_string(&alt) {
                Ok(c) => c,
                Err(_) => return vec![],
            }
        }
    };

    let mut tasks = Vec::new();
    for line in content.lines() {
        if line.starts_with(['\t', ' ', '#', '.']) {
            continue;
        }
        let target = match line.split(':').next() {
            Some(t) => t.trim(),
            None => continue,
        };
        if target.is_empty() || target.starts_with('.') {
            continue;
        }
        for name in target.split_whitespace() {
            if name.starts_with('.') {
                continue;
            }
            tasks.push(ProjectTask {
                name: name.to_string(),
                command: format!("make {name}"),
                source: "make".to_string(),
            });
        }
    }
    tasks.sort_by(|a, b| a.name.cmp(&b.name));
    tasks.dedup_by(|a, b| a.name == b.name);
    tasks
}

fn parse_cargo_toml(dir: &Path) -> Vec<ProjectTask> {
    let path = dir.join("Cargo.toml");
    if !path.is_file() {
        return vec![];
    }

    let mut tasks = vec![
        ProjectTask {
            name: "build".to_string(),
            command: "cargo build".to_string(),
            source: "cargo".to_string(),
        },
        ProjectTask {
            name: "test".to_string(),
            command: "cargo test".to_string(),
            source: "cargo".to_string(),
        },
        ProjectTask {
            name: "run".to_string(),
            command: "cargo run".to_string(),
            source: "cargo".to_string(),
        },
        ProjectTask {
            name: "clippy".to_string(),
            command: "cargo clippy".to_string(),
            source: "cargo".to_string(),
        },
    ];

    let content = match fs::read_to_string(&path) {
        Ok(c) => c,
        Err(_) => return tasks,
    };

    let mut in_bin_table = false;
    for line in content.lines() {
        let trimmed = line.trim();
        if trimmed == "[[bin]]" {
            in_bin_table = true;
            continue;
        }
        if in_bin_table && trimmed.starts_with('[') {
            in_bin_table = false;
        }
        if in_bin_table {
            if let Some(name) = trimmed.strip_prefix("name = ").and_then(|v| {
                v.trim()
                    .strip_prefix('"')
                    .and_then(|s| s.strip_suffix('"'))
            }) {
                tasks.push(ProjectTask {
                    name: format!("run:{name}"),
                    command: format!("cargo run --bin {name}"),
                    source: "cargo".to_string(),
                });
            }
        }
    }

    tasks.sort_by(|a, b| a.name.cmp(&b.name));
    tasks.dedup_by(|a, b| a.name == b.name);
    tasks
}

fn parse_justfile(dir: &Path) -> Vec<ProjectTask> {
    let path = dir.join("justfile");
    let content = match fs::read_to_string(&path) {
        Ok(c) => c,
        Err(_) => match fs::read_to_string(dir.join("Justfile")) {
            Ok(c) => c,
            Err(_) => return vec![],
        },
    };

    let mut tasks = Vec::new();
    for line in content.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() || trimmed.starts_with('#') || trimmed.starts_with('[') {
            continue;
        }
        if trimmed.starts_with('@') || trimmed.starts_with("export ") {
            continue;
        }
        let recipe = trimmed.split(':').next().unwrap_or("").trim();
        if recipe.is_empty() {
            continue;
        }
        let name = recipe.split_whitespace().next().unwrap_or("");
        if name.is_empty() || name.starts_with('=') {
            continue;
        }
        tasks.push(ProjectTask {
            name: name.to_string(),
            command: format!("just {name}"),
            source: "just".to_string(),
        });
    }
    tasks.sort_by(|a, b| a.name.cmp(&b.name));
    tasks.dedup_by(|a, b| a.name == b.name);
    tasks
}

fn parse_github_remote(url: &str) -> Option<(String, String)> {
    let url = url.trim();
    if let Some(rest) = url.strip_prefix("https://github.com/") {
        let rest = rest.trim_end_matches(".git");
        let mut parts = rest.split('/');
        let owner = parts.next()?;
        let repo = parts.next()?;
        if owner.is_empty() || repo.is_empty() {
            return None;
        }
        return Some((owner.to_string(), repo.to_string()));
    }
    if let Some(rest) = url.strip_prefix("git@github.com:") {
        let rest = rest.trim_end_matches(".git");
        let mut parts = rest.split('/');
        let owner = parts.next()?;
        let repo = parts.next()?;
        if owner.is_empty() || repo.is_empty() {
            return None;
        }
        return Some((owner.to_string(), repo.to_string()));
    }
    None
}

fn read_git_head_branch(root: &Path) -> Option<String> {
    let head = fs::read_to_string(root.join(".git/HEAD")).ok()?;
    let head = head.trim();
    head.strip_prefix("ref: refs/heads/")
        .map(|branch| branch.to_string())
}

fn read_origin_default_branch(root: &Path) -> String {
    let sym = root.join(".git/refs/remotes/origin/HEAD");
    if let Ok(content) = fs::read_to_string(sym) {
        let content = content.trim();
        if let Some(branch) = content.strip_prefix("ref: refs/remotes/origin/") {
            return branch.to_string();
        }
    }
    "main".to_string()
}

fn read_origin_url(root: &Path) -> Option<String> {
    let config = fs::read_to_string(root.join(".git/config")).ok()?;
    let mut in_origin = false;
    for line in config.lines() {
        let trimmed = line.trim();
        if trimmed == r#"[remote "origin"]"# {
            in_origin = true;
            continue;
        }
        if trimmed.starts_with('[') {
            in_origin = false;
        }
        if in_origin {
            if let Some(url) = trimmed.strip_prefix("url = ") {
                return Some(url.to_string());
            }
        }
    }
    None
}

#[tauri::command]
pub fn list_directory(path: String, include_hidden: Option<bool>) -> Result<Vec<DirEntry>, String> {
    fs_list_directory(&path, include_hidden.unwrap_or(false))
}

#[tauri::command]
pub fn stat_file(path: String) -> Result<FileStat, String> {
    fs_stat_file(&path)
}

#[tauri::command]
pub fn prepare_media_preview(path: String) -> Result<MediaPreviewPayload, String> {
    fs_prepare_media_preview(&path)
}

#[tauri::command]
pub fn read_file(path: String, max_bytes: Option<u64>) -> Result<FilePayload, String> {
    fs_read_file(&path, max_bytes)
}

#[tauri::command]
pub fn write_file(path: String, content: String) -> Result<(), String> {
    fs_write_file(&path, &content)
}

#[tauri::command]
pub fn watch_directory(
    app: AppHandle,
    manager: State<'_, WatcherManager>,
    path: String,
) -> Result<String, String> {
    manager.watch(app, &path)
}

#[tauri::command]
pub fn unwatch_directory(
    manager: State<'_, WatcherManager>,
    watch_id: String,
) -> Result<(), String> {
    manager.unwatch(&watch_id)
}

#[tauri::command]
pub fn get_github_compare_url(cwd: String) -> Result<Option<String>, String> {
    let resolved = resolve_cwd_path(&cwd);
    let root = match find_repo_root_from(&resolved) {
        Some(r) => r,
        None => return Ok(None),
    };
    let origin = match read_origin_url(&root) {
        Some(o) => o,
        None => return Ok(None),
    };
    let (owner, repo) = match parse_github_remote(&origin) {
        Some(v) => v,
        None => return Ok(None),
    };
    let branch = match read_git_head_branch(&root) {
        Some(b) => b,
        None => return Ok(None),
    };
    let base = read_origin_default_branch(&root);
    Ok(Some(format!(
        "https://github.com/{owner}/{repo}/compare/{base}...{branch}?expand=1"
    )))
}

#[tauri::command]
pub fn list_subfolders(path: String) -> Result<Vec<FolderEntry>, String> {
    fs_list_subfolders(&path)
}

#[tauri::command]
pub fn find_repo_root(cwd: String) -> Result<Option<String>, String> {
    let resolved = resolve_cwd_path(&cwd);
    Ok(find_repo_root_from(&resolved).map(|p| to_display_path(&p)))
}

#[tauri::command]
pub fn discover_project_tasks(cwd: String) -> Result<Vec<ProjectTask>, String> {
    let resolved = resolve_cwd_path(&cwd);
    let root = find_repo_root_from(&resolved).unwrap_or(resolved);

    let mut tasks = parse_package_json_scripts(&root);
    tasks.extend(parse_makefile_targets(&root));
    tasks.extend(parse_cargo_toml(&root));
    tasks.extend(parse_justfile(&root));
    Ok(tasks)
}

#[tauri::command]
pub fn get_git_branch(cwd: String) -> Result<Option<String>, String> {
    let resolved = resolve_cwd_path(&cwd);
    let root = match find_repo_root_from(&resolved) {
        Some(r) => r,
        None => return Ok(None),
    };
    Ok(read_git_head_branch(&root))
}

#[tauri::command]
pub fn list_git_branches(cwd: String) -> Result<Vec<String>, String> {
    let resolved = resolve_cwd_path(&cwd);
    let root = find_repo_root_from(&resolved).ok_or_else(|| "Not a git repository".to_string())?;

    let head_dir = root.join(".git").join("refs").join("heads");
    if !head_dir.is_dir() {
        return Ok(vec![]);
    }

    let mut branches = Vec::new();
    collect_branches(&head_dir, &mut branches, "");
    branches.sort();
    Ok(branches)
}

fn collect_branches(dir: &Path, branches: &mut Vec<String>, prefix: &str) {
    let read_dir = match fs::read_dir(dir) {
        Ok(d) => d,
        Err(_) => return,
    };

    for entry in read_dir.flatten() {
        let name = entry.file_name().to_string_lossy().to_string();
        let path = entry.path();
        let full_name = if prefix.is_empty() {
            name.clone()
        } else {
            format!("{prefix}/{name}")
        };

        if path.is_dir() {
            collect_branches(&path, branches, &full_name);
        } else {
            branches.push(full_name);
        }
    }
}
