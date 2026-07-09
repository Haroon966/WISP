# Wisp

A modern cross-platform terminal application built with Tauri 2, React, TypeScript, and xterm.js.

## Features

### Terminal
- Multi-tab sessions with **background PTY persistence** — switching tabs keeps shells alive
- Split panes (horizontal / vertical) with draggable handles, layout presets, and **broadcast input** to all panes
- Fish, Bash, or Zsh with OSC hooks for cwd, git branch, command capture, and run status
- WebGL-accelerated rendering with canvas fallback
- Clickable URLs and file paths in scrollback
- In-terminal scrollback search (`Ctrl+F`)
- Command run blocks and sidebar **activity feed** with status, timestamp, and re-run
- Clickable git branch badge — pull, push, branch switch, **open PR on GitHub**
- Command history dropdown (re-run or Shift+click to insert)
- Status indicators on sidebar tabs (idle, running, success, failed)

### Session management
- Left sidebar with searchable session list, rename (F2 / double-click)
- Places navigation (Home, Documents, Downloads, …) with folder tree
- Recent directories and project task discovery (`package.json`, `Makefile`, `Cargo.toml`, `justfile`)
- Reopen closed sessions stack
- **Workspaces** — save and restore full layouts (splits, SSH hosts, pane state)
- **Session restore on launch** — optional; reopens your last tab layout and working directories
- **Shell profiles** — cwd, shell choice, env vars, startup command per profile
- **Command snippets** — saved commands in the palette (Enter run, Shift+Enter insert)

### SSH
- SSH connection profiles (host, user, port, identity file, **jump host**)
- Edit profiles in Settings; connect from palette or settings

### Command palette (`Ctrl+Shift+P` / `Ctrl+K`)
- Jump to sessions, run history, snippets, shell profiles
- Places, recent directories, workspaces, SSH profiles
- New/split/close session actions

### Notifications & hotkeys
- Desktop notifications when a **background session** finishes a command (optional)
- **Global hotkey** (`Ctrl+` ` by default) to show/hide Wisp from anywhere (optional)

### Settings
- Theme (light / dark), sidebar width, terminal font and size
- Fish autosuggestions and completion overlay toggles
- Default working directory, confirm-on-close, closed-tab limit
- SSH, shell profiles, and snippet management

## Keyboard shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+T` | New session |
| `Ctrl+W` | Close session / pane |
| `Ctrl+Tab` | Next session |
| `Ctrl+Shift+Tab` | Previous session |
| `Ctrl+1–9` | Jump to session |
| `Ctrl+\` | Split horizontal |
| `Ctrl+Shift+\` | Split vertical |
| `Ctrl+Alt+←` / `Ctrl+Alt+↑` | Previous pane |
| `Ctrl+Alt+→` / `Ctrl+Alt+↓` | Next pane |
| `Ctrl+Shift+T` | Reopen closed session |
| `Ctrl+Shift+H` | Command history |
| `Ctrl+F` | Find in terminal |
| `Ctrl+Shift+P` / `Ctrl+K` | Command palette |
| `Ctrl+,` | Settings |
| `F2` | Rename session |
| `Ctrl+` ` | Toggle window (global hotkey, when enabled) |

## Requirements

- [Node.js](https://nodejs.org/) 18+
- [Rust](https://rustup.rs/)
- Platform dependencies for [Tauri](https://tauri.app/start/prerequisites/)
- [Fish shell](https://fishshell.com/) (recommended; Bash/Zsh supported with metadata hooks)

## Development

```bash
npm install
npm run tauri dev
```

## Build

```bash
npm run tauri build
```

Produces installers for Windows (`.msi`), macOS (`.dmg`), and Linux (`.deb`/AppImage).

## Design

See `design-system/wisp/MASTER.md` for the persisted design system.

## Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, shadcn/ui, Zustand, xterm.js
- **Backend:** Tauri 2, portable-pty, Fish/Bash/Zsh shell resolver
