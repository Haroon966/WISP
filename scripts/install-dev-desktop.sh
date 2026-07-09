#!/usr/bin/env bash
# ponytail: GNOME dock matches running apps to .desktop files, not raw binaries.
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
desktop_dir="${XDG_DATA_HOME:-$HOME/.local/share}/applications"
desktop_file="$desktop_dir/com.olufsen.wisp.desktop"

mkdir -p "$desktop_dir"
cat >"$desktop_file" <<EOF
[Desktop Entry]
Type=Application
Name=Wisp
Comment=Wisp terminal
Exec=$root/src-tauri/target/debug/wisp
Icon=$root/src-tauri/icons/icon.png
Terminal=false
Categories=Utility;TerminalEmulator;
StartupWMClass=com.olufsen.wisp
EOF

if command -v update-desktop-database >/dev/null 2>&1; then
  update-desktop-database "$desktop_dir" >/dev/null 2>&1 || true
fi
