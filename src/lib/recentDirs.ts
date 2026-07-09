const STORAGE_KEY = "wisp-recent-dirs";
const MAX_RECENT = 20;
const EMPTY_RECENT: string[] = [];

export function loadRecentDirs(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_RECENT;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((p) => typeof p === "string") : [];
  } catch {
    return EMPTY_RECENT;
  }
}

export function saveRecentDirs(dirs: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(dirs.slice(0, MAX_RECENT)));
}

export function recordRecentDir(cwd: string) {
  if (!cwd || cwd === "~") return;
  const normalized = cwd.trim();
  if (!normalized) return;
  const dirs = loadRecentDirs();
  if (dirs[0] === normalized) return;
  const next = [normalized, ...dirs.filter((d) => d !== normalized)];
  saveRecentDirs(next);
}
