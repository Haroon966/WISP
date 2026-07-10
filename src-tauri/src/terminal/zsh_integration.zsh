# ponytail: sourced from ZDOTDIR/.zshrc after the user's ~/.zshrc
autoload -Uz add-zsh-hook

__wisp_b64() { printf '%s' "$1" | base64 | tr -d '\n'; }

__wisp_sync_cwd() {
  local host=$(hostname 2>/dev/null || echo localhost)
  printf '\033]7;file://%s%s\033\\' "$host" "$PWD"
}

__wisp_preexec() {
  printf '\033]777;START\033\\'
  printf '\033]779;%s\033\\' "$(__wisp_b64 "$1")"
}

__wisp_precmd() {
  local c=$?
  __wisp_sync_cwd
  printf '\033]777;EXIT;%d\033\\' "$c"
}

add-zsh-hook preexec __wisp_preexec
add-zsh-hook precmd __wisp_precmd
__wisp_sync_cwd
