export type EditorEncoding =
  | "utf8"
  | "binary"
  | "too_large"
  | "image"
  | "video";

export type MediaStatus = "ready" | "resolving" | "error";

export type MdViewMode = "preview" | "source";

export interface EditorFile {
  id: string;
  path: string;
  absolutePath: string;
  language: string;
  content: string;
  savedContent: string;
  dirty: boolean;
  preview: boolean;
  mdViewMode: MdViewMode;
  version: number;
  lastModifiedMs: number;
  encoding: EditorEncoding;
  mimeType: string | null;
  mediaStatus: MediaStatus;
  conflict: boolean;
  size: number;
}

export interface TabEditorState {
  rootPath: string;
  watchId: string | null;
  expandedPaths: string[];
  files: EditorFile[];
  activeFileId: string | null;
  editorTerminalSizes: [number, number];
  treeVersion: number;
  /** Per-directory refresh generation for scoped file-tree invalidation */
  dirVersions: Record<string, number>;
}

export interface PersistedEditorFile {
  path: string;
  preview: boolean;
}

export interface PersistedTabEditor {
  rootPath: string;
  expandedPaths: string[];
  files: PersistedEditorFile[];
  activeFilePath: string | null;
  editorTerminalSizes: [number, number];
}

export type ConflictChoice = "keep" | "reload" | "saveAndReload";

export const DEFAULT_EDITOR_TERMINAL_SIZES: [number, number] = [1.4, 1];

export function emptyTabEditorState(rootPath: string): TabEditorState {
  return {
    rootPath,
    watchId: null,
    expandedPaths: [],
    files: [],
    activeFileId: null,
    editorTerminalSizes: [...DEFAULT_EDITOR_TERMINAL_SIZES],
    treeVersion: 0,
    dirVersions: {},
  };
}

export function toPersistedTabEditor(state: TabEditorState): PersistedTabEditor {
  const active = state.files.find((f) => f.id === state.activeFileId);
  return {
    rootPath: state.rootPath,
    expandedPaths: state.expandedPaths,
    files: state.files.map((f) => ({ path: f.path, preview: f.preview })),
    activeFilePath: active?.path ?? null,
    editorTerminalSizes: state.editorTerminalSizes,
  };
}
