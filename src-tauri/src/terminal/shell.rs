use std::collections::HashMap;
use std::path::{Path, PathBuf};

use portable_pty::CommandBuilder;

#[derive(Clone, Default)]
pub struct ShellOptions {
    pub fish_autosuggestions: bool,
}

impl ShellOptions {
    pub fn from_spawn(fish_autosuggestions: Option<bool>) -> Self {
        Self {
            fish_autosuggestions: fish_autosuggestions.unwrap_or(true),
        }
    }
}

const BASH_HOOKS: &str = r#"
__wisp_b64() { printf '%s' "$1" | base64 | tr -d '\n'; }
__wisp_sync_cwd() {
  local host=$(hostname 2>/dev/null || echo localhost)
  printf '\033]7;file://%s%s\033\\' "$host" "$PWD"
}
__wisp_preexec() { [ "$BASH_COMMAND" = "$__wisp_last" ] && return; __wisp_last="$BASH_COMMAND"; printf '\033]777;START\033\\'; printf '\033]779;%s\033\\' "$(__wisp_b64 "$BASH_COMMAND")"; }
__wisp_postexec() { local c=$?; __wisp_sync_cwd; printf '\033]777;EXIT;%d\033\\' "$c"; return $c; }
export -f __wisp_b64 __wisp_sync_cwd __wisp_preexec __wisp_postexec 2>/dev/null || true
export PROMPT_COMMAND='__wisp_postexec${PROMPT_COMMAND:+; $PROMPT_COMMAND}'
trap '__wisp_preexec' DEBUG
"#;

const ZSH_INTEGRATION: &str = include_str!("zsh_integration.zsh");

pub fn resolve_cwd(cwd: Option<&Path>) -> PathBuf {
    let home = dirs::home_dir().unwrap_or_else(|| PathBuf::from("."));
    let Some(path) = cwd else {
        return home;
    };

    let s = path.to_string_lossy();
    if s == "~" {
        return home;
    }
    if let Some(rest) = s.strip_prefix("~/") {
        return home.join(rest);
    }
    if s.starts_with('~') {
        return home.join(s.trim_start_matches('~').trim_start_matches('/'));
    }

    path.to_path_buf()
}

pub fn resolve_fish_shell() -> Option<PathBuf> {
    resolve_shell_candidates(if cfg!(target_os = "macos") {
        vec![
            "/opt/homebrew/bin/fish",
            "/usr/local/bin/fish",
            "/usr/bin/fish",
        ]
    } else if cfg!(target_os = "linux") {
        vec!["/usr/bin/fish", "/usr/local/bin/fish"]
    } else if cfg!(target_os = "windows") {
        vec![
            r"C:\Program Files\fish\fish.exe",
            r"C:\msys64\usr\bin\fish.exe",
            r"C:\cygwin64\bin\fish.exe",
        ]
    } else {
        vec![]
    })
}

pub fn resolve_bash_shell() -> Option<PathBuf> {
    resolve_shell_candidates(vec!["/bin/bash", "/usr/bin/bash", "/usr/local/bin/bash"])
}

pub fn resolve_zsh_shell() -> Option<PathBuf> {
    resolve_shell_candidates(vec![
        "/bin/zsh",
        "/usr/bin/zsh",
        "/usr/local/bin/zsh",
        "/opt/homebrew/bin/zsh",
    ])
}

fn resolve_shell_candidates(candidates: Vec<&str>) -> Option<PathBuf> {
    for path in candidates {
        let p = Path::new(path);
        if p.exists() {
            return Some(p.to_path_buf());
        }
    }
    None
}

fn prepare_zsh_zdotdir() -> Option<PathBuf> {
    let dir = std::env::temp_dir().join(format!("wisp-zsh-{}", std::process::id()));
    std::fs::create_dir_all(&dir).ok()?;
    let zshrc = format!(
        r#"# ponytail: user zshrc first, then wisp integration hooks
emulate sh -c '[[ -f "$HOME/.zprofile" ]] && source "$HOME/.zprofile"'
emulate sh -c '[[ -f "$HOME/.zshrc" ]] && source "$HOME/.zshrc"'
{integration}
"#,
        integration = ZSH_INTEGRATION,
    );
    std::fs::write(dir.join(".zshrc"), zshrc).ok()?;
    Some(dir)
}

fn configure_fish(c: &mut CommandBuilder, opts: &ShellOptions) {
    c.arg("-l");
    c.env(
        "WISP_FISH_AUTOSUGGEST",
        if opts.fish_autosuggestions { "1" } else { "0" },
    );
    // ponytail: VS Code-style passthrough — user's fish_prompt, only cwd + command hooks
    c.arg("-C");
    c.arg("function __wisp_sync_cwd; printf '\\e]7;file://%s%s\\a' (hostname) $PWD; end");
    c.arg("-C");
    c.arg("function __wisp_pwd --on-variable PWD; __wisp_sync_cwd; end");
    c.arg("-C");
    c.arg("function __wisp_preexec --on-event fish_preexec; printf '\\e]777;START\\a'; if test (count $argv) -gt 0; printf '\\e]779;%s\\a' (printf '%s' $argv | base64 | string join ''); end; end");
    c.arg("-C");
    c.arg("function __wisp_postexec --on-event fish_postexec; __wisp_sync_cwd; printf '\\e]777;EXIT;%d\\a' $status; end");
    c.arg("-C");
    c.arg("function __wisp_init --on-event fish_prompt; functions -e __wisp_init; __wisp_sync_cwd; end");
    c.arg("-C");
    c.arg("set -g fish_autosuggestion_enabled (test \"$WISP_FISH_AUTOSUGGEST\" = 1; and echo 1; or echo 0)");
}

fn configure_bash(c: &mut CommandBuilder) {
    c.arg("-l");
    c.arg("-c");
    c.arg(format!("{BASH_HOOKS} exec bash -l -i"));
}

fn configure_zsh(c: &mut CommandBuilder) {
    if let Some(zdotdir) = prepare_zsh_zdotdir() {
        c.env("ZDOTDIR", zdotdir);
    }
    c.arg("-l");
    c.arg("-i");
}

fn apply_extra_env(cmd: &mut CommandBuilder, env: &HashMap<String, String>) {
    for (key, value) in env {
        cmd.env(key, value);
    }
}

pub fn build_shell_command(
    cwd: Option<&Path>,
    opts: &ShellOptions,
    shell: Option<&str>,
    extra_env: &HashMap<String, String>,
) -> CommandBuilder {
    let cwd = resolve_cwd(cwd);
    let shell = shell.unwrap_or("auto");

    let mut cmd = match shell {
        "fish" => resolve_fish_shell().map(|fish| {
            let mut c = CommandBuilder::new(fish);
            configure_fish(&mut c, opts);
            c
        }),
        "bash" => resolve_bash_shell().map(|bash| {
            let mut c = CommandBuilder::new(bash);
            configure_bash(&mut c);
            c
        }),
        "zsh" => resolve_zsh_shell().map(|zsh| {
            let mut c = CommandBuilder::new(zsh);
            configure_zsh(&mut c);
            c
        }),
        _ => None,
    };

    if cmd.is_none() {
        cmd = resolve_fish_shell().map(|fish| {
            let mut c = CommandBuilder::new(fish);
            configure_fish(&mut c, opts);
            c
        });
    }

    if cmd.is_none() {
        if let Some(bash) = resolve_bash_shell() {
            let mut c = CommandBuilder::new(bash);
            configure_bash(&mut c);
            cmd = Some(c);
        } else if let Some(zsh) = resolve_zsh_shell() {
            let mut c = CommandBuilder::new(zsh);
            configure_zsh(&mut c);
            cmd = Some(c);
        }
    }

    let mut cmd = cmd.unwrap_or_else(|| {
        if cfg!(target_os = "windows") {
            let mut c = CommandBuilder::new("powershell.exe");
            c.arg("-NoLogo");
            c
        } else {
            CommandBuilder::new_default_prog()
        }
    });

    cmd.env("TERM", "xterm-256color");
    cmd.env("COLORTERM", "truecolor");
    apply_extra_env(&mut cmd, extra_env);
    cmd.cwd(&cwd);
    cmd
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn zsh_integration_script_has_hooks() {
        assert!(ZSH_INTEGRATION.contains("add-zsh-hook precmd __wisp_precmd"));
        assert!(ZSH_INTEGRATION.contains("__wisp_sync_cwd"));
    }

    #[test]
    fn bash_hooks_export_functions() {
        assert!(BASH_HOOKS.contains("export -f __wisp_b64"));
        assert!(BASH_HOOKS.contains("PROMPT_COMMAND='__wisp_postexec"));
    }
}
