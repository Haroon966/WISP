import { invoke } from "@tauri-apps/api/core";

export type FolderEntry = {
  name: string;
  path: string;
};

export type DirEntry = {
  name: string;
  path: string;
  kind: "file" | "dir";
  size: number;
  modifiedMs: number;
};

export type FileStat = {
  path: string;
  kind: "file" | "dir";
  size: number;
  modifiedMs: number;
};

export type FilePayload = {
  path: string;
  absolutePath: string;
  content: string;
  encoding: "utf8" | "binary" | "too_large" | "image" | "video";
  mimeType: string | null;
  truncated: boolean;
  size: number;
};

export type ProjectTask = {
  name: string;
  command: string;
  source: string;
};

export function listSubfolders(path: string): Promise<FolderEntry[]> {
  return invoke<FolderEntry[]>("list_subfolders", { path });
}

export function listDirectory(
  path: string,
  includeHidden = false,
): Promise<DirEntry[]> {
  return invoke<DirEntry[]>("list_directory", { path, includeHidden });
}

export type MediaPreviewPayload = {
  path: string;
  absolutePath: string;
  encoding: "image" | "video" | "too_large";
  mimeType: string;
  size: number;
  modifiedMs: number;
};

export function prepareMediaPreview(path: string): Promise<MediaPreviewPayload> {
  return invoke<MediaPreviewPayload>("prepare_media_preview", { path });
}

export function statFile(path: string): Promise<FileStat> {
  return invoke<FileStat>("stat_file", { path });
}

export function readFile(
  path: string,
  maxBytes?: number,
): Promise<FilePayload> {
  return invoke<FilePayload>("read_file", { path, maxBytes });
}

export function writeFile(path: string, content: string): Promise<void> {
  return invoke<void>("write_file", { path, content });
}

export function watchDirectory(path: string): Promise<string> {
  return invoke<string>("watch_directory", { path });
}

export function unwatchDirectory(watchId: string): Promise<void> {
  return invoke<void>("unwatch_directory", { watchId });
}

export function findRepoRoot(cwd: string): Promise<string | null> {
  return invoke<string | null>("find_repo_root", { cwd });
}

export function discoverProjectTasks(cwd: string): Promise<ProjectTask[]> {
  return invoke<ProjectTask[]>("discover_project_tasks", { cwd });
}

export function listGitBranches(cwd: string): Promise<string[]> {
  return invoke<string[]>("list_git_branches", { cwd });
}

export function getGitBranch(cwd: string): Promise<string | null> {
  return invoke<string | null>("get_git_branch", { cwd });
}

export function getGithubCompareUrl(cwd: string): Promise<string | null> {
  return invoke<string | null>("get_github_compare_url", { cwd });
}

export function projectNameFromRoot(root: string): string {
  const normalized = root.replace(/\/$/, "");
  const segment = normalized.split("/").filter(Boolean).pop();
  return segment ?? root;
}
