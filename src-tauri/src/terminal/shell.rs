use std::path::{Path, PathBuf};

use portable_pty::CommandBuilder;

pub fn resolve_fish_shell() -> Option<PathBuf> {
    let candidates: Vec<&str> = if cfg!(target_os = "macos") {
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
    };

    for path in candidates {
        let p = Path::new(path);
        if p.exists() {
            return Some(p.to_path_buf());
        }
    }

    which::which("fish").ok()
}

pub fn build_shell_command(cwd: Option<&Path>) -> CommandBuilder {
    let home = dirs::home_dir().unwrap_or_else(|| PathBuf::from("."));
    let cwd = cwd.unwrap_or(home.as_path());

    let mut cmd = if let Some(fish) = resolve_fish_shell() {
        let mut c = CommandBuilder::new(fish);
        c.arg("-l");
        c.env("fish_greeting", "");
        c.arg("-C");
        c.arg("function __wisp_sync_meta; printf '\\e]7;file://%s%s\\a' (hostname) $PWD; set -l b (command git branch --show-current 2>/dev/null); if test -n \"$b\"; printf '\\e]778;%s\\a' $b; else; printf '\\e]778;\\a'; end; end");
        c.arg("-C");
        c.arg("function fish_prompt; __wisp_sync_meta; echo -n (set_color brcyan)'❯ '(set_color normal); end");
        c.arg("-C");
        c.arg("function __wisp_pwd --on-variable PWD; __wisp_sync_meta; end");
        c.arg("-C");
        c.arg("function __wisp_preexec --on-event fish_preexec; printf '\\e]777;START\\a'; end");
        c.arg("-C");
        c.arg("function __wisp_postexec --on-event fish_postexec; __wisp_sync_meta; printf '\\e]777;EXIT;%d\\a' $status; end");
        c
    } else if cfg!(target_os = "windows") {
        let mut c = CommandBuilder::new("powershell.exe");
        c.arg("-NoLogo");
        c
    } else {
        CommandBuilder::new_default_prog()
    };

    cmd.env("TERM", "xterm-256color");
    cmd.env("COLORTERM", "truecolor");
    cmd.cwd(cwd);
    cmd
}
