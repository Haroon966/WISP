# Wisp

A modern cross-platform terminal application built with Tauri 2, React, TypeScript, and xterm.js.

## Features

- Left sidebar with tab list and status indicators (idle, running, success)
- Multi-tab terminal sessions with Fish shell by default
- Command history dropdown (re-run or Shift+click to insert)
- Keyboard shortcuts: `Ctrl+T` new tab, `Ctrl+W` close, `Ctrl+Tab` switch, `Ctrl+Shift+H` history

## Requirements

- [Node.js](https://nodejs.org/) 18+
- [Rust](https://rustup.rs/)
- Platform dependencies for [Tauri](https://tauri.app/start/prerequisites/)
- [Fish shell](https://fishshell.com/) (recommended; falls back to PowerShell on Windows or `$SHELL` on Unix)

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
- **Backend:** Tauri 2, portable-pty, Fish shell resolver
# WISP
