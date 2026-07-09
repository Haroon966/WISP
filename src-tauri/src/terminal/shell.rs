use std::collections::HashMap;
use std::path::{Path, PathBuf};

use portable_pty::CommandBuilder;

#[derive(Clone, Default)]
pub struct ShellOptions {
    pub fish_autosuggestions: bool,
    pub fish_overlay: bool,
}

impl ShellOptions {
    pub fn from_spawn(fish_autosuggestions: Option<bool>, fish_overlay: Option<bool>) -> Self {
        Self {
            fish_autosuggestions: fish_autosuggestions.unwrap_or(true),
            fish_overlay: fish_overlay.unwrap_or(true),
        }
    }
}

const BASH_HOOKS: &str = r#"
__wisp_b64() { printf '%s' "$1" | base64 | tr -d '\n'; }
__wisp_sync_meta() {
  local host=$(hostname 2>/dev/null || echo localhost)
  printf '\033]7;file://%s%s\033\\' "$host" "$PWD"
  local b=$(git branch --show-current 2>/dev/null)
  if [ -n "$b" ]; then printf '\033]778;%s\033\\' "$b"; else printf '\033]778;\033\\'; fi
}
__wisp_preexec() { [ "$BASH_COMMAND" = "$__wisp_last" ] && return; __wisp_last="$BASH_COMMAND"; printf '\033]777;START\033\\'; printf '\033]779;%s\033\\' "$(__wisp_b64 "$BASH_COMMAND")"; }
__wisp_postexec() { local c=$?; __wisp_sync_meta; printf '\033]777;EXIT;%d\033\\' "$c"; return $c; }
export PROMPT_COMMAND='__wisp_postexec'
trap '__wisp_preexec' DEBUG
"#;

const ZSH_HOOKS: &str = r#"
__wisp_b64() { printf '%s' "$1" | base64 | tr -d '\n'; }
__wisp_sync_meta() {
  local host=$(hostname 2>/dev/null || echo localhost)
  printf '\033]7;file://%s%s\033\\' "$host" "$PWD"
  local b=$(git branch --show-current 2>/dev/null)
  if [ -n "$b" ]; then printf '\033]778;%s\033\\' "$b"; else printf '\033]778;\033\\'; fi
}
preexec() { printf '\033]777;START\033\\'; printf '\033]779;%s\033\\' "$(__wisp_b64 "$1")"; }
precmd() { local c=$?; __wisp_sync_meta; printf '\033]777;EXIT;%d\033\\' "$c"; }
"#;

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

fn configure_fish(c: &mut CommandBuilder, opts: &ShellOptions) {
    c.arg("-l");
    c.env("fish_greeting", "");
    c.env(
        "WISP_FISH_AUTOSUGGEST",
        if opts.fish_autosuggestions { "1" } else { "0" },
    );
    c.env(
        "WISP_FISH_OVERLAY",
        if opts.fish_overlay { "1" } else { "0" },
    );
    c.arg("-C");
    c.arg("function __wisp_sync_meta; printf '\\e]7;file://%s%s\\a' (hostname) $PWD; set -l b (command git branch --show-current 2>/dev/null); if test -n \"$b\"; printf '\\e]778;%s\\a' $b; else; printf '\\e]778;\\a'; end; end");
    c.arg("-C");
    c.arg(
        "function fish_prompt; \
        __wisp_sync_meta; \
        set -l path $PWD; \
        if test \"$PWD\" = \"$HOME\"; set path ~; \
        else if string match -q -- \"$HOME/*\" $PWD; set path ~/(string sub -s (math (string length $HOME) + 2) -- $PWD); \
        end; \
        set -l b (command git branch --show-current 2>/dev/null); \
        echo -n (set_color green)$path(set_color normal); \
        if test -n \"$b\"; echo -n \" ($b)\"; end; \
        echo -n \"> \"; \
        end",
    );
    c.arg("-C");
    c.arg("function __wisp_pwd --on-variable PWD; __wisp_sync_meta; end");
    c.arg("-C");
    c.arg("function __wisp_preexec --on-event fish_preexec; printf '\\e]777;START\\a'; if test (count $argv) -gt 0; printf '\\e]779;%s\\a' (printf '%s' $argv | base64 | string join ''); end; end");
    c.arg("-C");
    c.arg("function __wisp_postexec --on-event fish_postexec; __wisp_sync_meta; printf '\\e]777;EXIT;%d\\a' $status; end");
    c.arg("-C");
    c.arg("fish_default_key_bindings");
    c.arg("-C");
    c.arg("set -g fish_autosuggestion_enabled (test \"$WISP_FISH_AUTOSUGGEST\" = 1; and echo 1; or echo 0)");
    c.arg("-C");
    c.arg(
        "function __wisp_complete_emit; \
        if test \"$WISP_FISH_OVERLAY\" != 1; return; end; \
        set -l cmd $__wisp_complete_pending; \
        if test (commandline -cp) != \"$cmd\"; return; end; \
        if test \"$cmd\" = \"$__wisp_complete_last\"; return; end; \
        set -g __wisp_complete_last \"$cmd\"; \
        set -l matches (complete -C\"$cmd\"); \
        set -l json '{\"prefix\":\"'\"$cmd\"'\",\"candidates\":['; \
        set -l i 0; \
        for m in $matches; \
        if test $i -gt 0; set json \"$json,\"; end; \
        set json \"$json\\\"\"$m\"\\\"\"; \
        set i (math $i + 1); \
        end; \
        set json \"$json]}\"; \
        printf '\\e]780;%s\\a' (printf '%s' $json | base64 | string join ''); \
        end; \
        function __wisp_complete_sync --on-event fish_preinput; \
        if test \"$WISP_FISH_OVERLAY\" != 1; return; end; \
        set -g __wisp_complete_pending (commandline -cp); \
        if set -q __wisp_complete_pid; kill $__wisp_complete_pid 2>/dev/null; end; \
        set -g __wisp_complete_pid (begin; sleep 0.08; __wisp_complete_emit; end & echo $last_pid); \
        end",
    );
}

fn configure_bash(c: &mut CommandBuilder) {
    c.arg("-l");
    c.arg("-c");
    c.arg(format!("{BASH_HOOKS} exec bash -l -i"));
}

fn configure_zsh(c: &mut CommandBuilder) {
    c.arg("-l");
    c.arg("-c");
    c.arg(format!("{ZSH_HOOKS} exec zsh -l -i"));
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
