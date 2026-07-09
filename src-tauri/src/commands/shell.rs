use crate::terminal::shell;

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ShellInfo {
    pub kind: String,
    pub path: Option<String>,
    pub version: Option<String>,
    pub bash_path: Option<String>,
    pub zsh_path: Option<String>,
}

fn shell_version(path: &std::path::Path) -> Option<String> {
    std::process::Command::new(path)
        .arg("--version")
        .output()
        .ok()
        .and_then(|o| String::from_utf8(o.stdout).ok())
        .map(|s| s.trim().to_string())
}

#[tauri::command]
pub fn get_shell_info() -> ShellInfo {
    let bash_path = shell::resolve_bash_shell();
    let zsh_path = shell::resolve_zsh_shell();

    let Some(path) = shell::resolve_fish_shell() else {
        return ShellInfo {
            kind: "fallback".into(),
            path: None,
            version: None,
            bash_path: bash_path.map(|p| p.to_string_lossy().into_owned()),
            zsh_path: zsh_path.map(|p| p.to_string_lossy().into_owned()),
        };
    };

    ShellInfo {
        kind: "fish".into(),
        path: Some(path.to_string_lossy().into_owned()),
        version: shell_version(&path),
        bash_path: bash_path.map(|p| p.to_string_lossy().into_owned()),
        zsh_path: zsh_path.map(|p| p.to_string_lossy().into_owned()),
    }
}
