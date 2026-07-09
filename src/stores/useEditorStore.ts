import { create } from "zustand";
import {
  readFile,
  statFile,
  unwatchDirectory,
  watchDirectory,
  writeFile,
} from "@/lib/fs";
import { languageFromPath } from "@/lib/languageFromPath";
import { isMarkdownPath } from "@/lib/markdown";
import {
  getCachedMedia,
  invalidateMediaCache,
  resolveMediaPreview,
} from "@/lib/mediaCache";
import {
  mediaKindFromPath,
  mimeTypeFromPath,
  type MediaKind,
} from "@/lib/media";
import type { MediaPreviewPayload } from "@/lib/fs";
import { useSettingsStore } from "@/stores/useSettingsStore";
import type {
  ConflictChoice,
  EditorFile,
  MdViewMode,
  PersistedTabEditor,
  TabEditorState,
} from "@/types/editor";
import {
  DEFAULT_EDITOR_TERMINAL_SIZES,
  emptyTabEditorState,
  toPersistedTabEditor,
} from "@/types/editor";

function dirsToInvalidate(changedPaths: string[], rootPath: string): string[] {
  const dirs = new Set<string>([rootPath]);
  for (const changed of changedPaths) {
    dirs.add(changed);
    let cur = changed;
    while (true) {
      const slash = cur.lastIndexOf("/");
      if (slash <= 0) break;
      cur = cur.slice(0, slash);
      dirs.add(cur);
      if (cur === rootPath) break;
    }
  }
  return [...dirs];
}

interface EditorStore {
  byTabId: Record<string, TabEditorState>;
  initTabEditor: (
    tabId: string,
    rootPath: string,
    restored?: PersistedTabEditor,
  ) => Promise<void>;
  setRootPath: (tabId: string, rootPath: string) => Promise<void>;
  openFile: (
    tabId: string,
    path: string,
    opts?: { preview?: boolean; pin?: boolean; forceLarge?: boolean },
  ) => Promise<string | null>;
  closeFile: (tabId: string, fileId: string, force?: boolean) => boolean;
  setActiveFile: (tabId: string, fileId: string) => void;
  pinFile: (tabId: string, fileId: string) => void;
  setMdViewMode: (tabId: string, fileId: string, mode: MdViewMode) => void;
  updateContent: (tabId: string, fileId: string, content: string) => void;
  saveFile: (tabId: string, fileId: string) => Promise<boolean>;
  saveActiveFile: (tabId: string) => Promise<boolean>;
  revertFile: (tabId: string, fileId: string) => Promise<void>;
  setEditorTerminalSizes: (tabId: string, sizes: [number, number]) => void;
  toggleExpanded: (tabId: string, path: string) => void;
  setExpandedPaths: (tabId: string, paths: string[]) => void;
  bumpTreeVersion: (tabId: string) => void;
  invalidateTreePaths: (tabId: string, paths: string[]) => void;
  handleExternalChange: (tabId: string, paths: string[]) => Promise<void>;
  resolveConflict: (
    tabId: string,
    fileId: string,
    choice: ConflictChoice,
  ) => Promise<void>;
  destroyTabEditor: (tabId: string) => Promise<void>;
  hasDirtyFiles: (tabId: string) => boolean;
  getPersistedState: () => Record<string, PersistedTabEditor>;
  restorePersisted: (editorByTabId: Record<string, PersistedTabEditor>) => void;
}

function updateTab(
  state: Record<string, TabEditorState>,
  tabId: string,
  updater: (tab: TabEditorState) => TabEditorState,
): Record<string, TabEditorState> {
  const current = state[tabId] ?? emptyTabEditorState("~");
  return { ...state, [tabId]: updater(current) };
}

async function startWatch(rootPath: string): Promise<string | null> {
  try {
    return await watchDirectory(rootPath);
  } catch {
    return null;
  }
}

async function stopWatch(watchId: string | null) {
  if (!watchId) return;
  try {
    await unwatchDirectory(watchId);
  } catch {
    // ponytail: best-effort cleanup
  }
}

function createEditorFile(
  path: string,
  payload: Awaited<ReturnType<typeof readFile>>,
  preview: boolean,
  lastModifiedMs: number,
): EditorFile {
  return {
    id: crypto.randomUUID(),
    path: payload.path,
    absolutePath: payload.absolutePath,
    language: languageFromPath(path),
    content: payload.content,
    savedContent: payload.content,
    dirty: false,
    preview,
    mdViewMode: isMarkdownPath(path) ? "preview" : "source",
    version: 0,
    lastModifiedMs,
    encoding: payload.encoding,
    mimeType: payload.mimeType,
    mediaStatus: "ready",
    conflict: false,
    size: payload.size,
  };
}

function createMediaEditorFile(
  path: string,
  payload: MediaPreviewPayload,
  preview: boolean,
): EditorFile {
  return {
    id: crypto.randomUUID(),
    path: payload.path,
    absolutePath: payload.absolutePath,
    language: languageFromPath(path),
    content: "",
    savedContent: "",
    dirty: false,
    preview,
    mdViewMode: isMarkdownPath(path) ? "preview" : "source",
    version: 0,
    lastModifiedMs: payload.modifiedMs,
    encoding: payload.encoding,
    mimeType: payload.mimeType,
    mediaStatus: "ready",
    conflict: false,
    size: payload.size,
  };
}

function createResolvingMediaFile(
  path: string,
  kind: MediaKind,
  preview: boolean,
): EditorFile {
  return {
    id: crypto.randomUUID(),
    path,
    absolutePath: "",
    language: languageFromPath(path),
    content: "",
    savedContent: "",
    dirty: false,
    preview,
    mdViewMode: isMarkdownPath(path) ? "preview" : "source",
    version: 0,
    lastModifiedMs: Date.now(),
    encoding: kind,
    mimeType: mimeTypeFromPath(path),
    mediaStatus: "resolving",
    conflict: false,
    size: 0,
  };
}

function applyMediaPayload(file: EditorFile, payload: MediaPreviewPayload): EditorFile {
  return {
    ...file,
    path: payload.path,
    absolutePath: payload.absolutePath,
    encoding: payload.encoding,
    mimeType: payload.mimeType,
    size: payload.size,
    lastModifiedMs: payload.modifiedMs,
    mediaStatus: "ready",
    version: file.version + (file.absolutePath ? 1 : 0),
  };
}

function insertFileIntoTab(
  tabId: string,
  tab: TabEditorState,
  file: EditorFile,
  preview: boolean,
  replacePath?: string,
) {
  let files = [...tab.files];
  if (preview) {
    const previewIdx = files.findIndex((f) => f.preview);
    if (previewIdx !== -1) files.splice(previewIdx, 1);
  }
  if (replacePath) {
    files = files.filter((f) => f.path !== replacePath);
  }
  files.push(file);
  useEditorStore.setState((s) => ({
    byTabId: updateTab(s.byTabId, tabId, (t) => ({
      ...t,
      files,
      activeFileId: file.id,
    })),
  }));
  return file.id;
}

async function hydrateMediaFile(tabId: string, fileId: string, path: string) {
  try {
    const payload = await resolveMediaPreview(path);
    useEditorStore.setState((s) => ({
      byTabId: updateTab(s.byTabId, tabId, (t) => ({
        ...t,
        files: t.files.map((f) =>
          f.id === fileId ? applyMediaPayload(f, payload) : f,
        ),
      })),
    }));
  } catch {
    useEditorStore.setState((s) => ({
      byTabId: updateTab(s.byTabId, tabId, (t) => ({
        ...t,
        files: t.files.map((f) =>
          f.id === fileId ? { ...f, mediaStatus: "error" as const } : f,
        ),
      })),
    }));
  }
}

export const useEditorStore = create<EditorStore>((set, get) => ({
  byTabId: {},

  initTabEditor: async (tabId, rootPath, restored) => {
    const existing = get().byTabId[tabId];
    if (existing?.watchId) await stopWatch(existing.watchId);

    const watchId = await startWatch(rootPath);
    const base = emptyTabEditorState(rootPath);
    if (restored) {
      base.rootPath = restored.rootPath;
      base.expandedPaths = restored.expandedPaths;
      base.editorTerminalSizes = restored.editorTerminalSizes;
    }
    base.watchId = watchId;

    set((s) => ({ byTabId: { ...s.byTabId, [tabId]: base } }));

    if (restored?.files.length) {
      for (const f of restored.files) {
        await get().openFile(tabId, f.path, { preview: f.preview, pin: !f.preview });
      }
      if (restored.activeFilePath) {
        const tab = get().byTabId[tabId];
        const file = tab?.files.find((f) => f.path === restored.activeFilePath);
        if (file) get().setActiveFile(tabId, file.id);
      }
    }
  },

  setRootPath: async (tabId, rootPath) => {
    const tab = get().byTabId[tabId];
    if (tab?.rootPath === rootPath) return;
    await get().initTabEditor(tabId, rootPath, {
      rootPath,
      expandedPaths: tab?.expandedPaths ?? [],
      files: (tab?.files ?? []).map((f) => ({ path: f.path, preview: f.preview })),
      activeFilePath:
        tab?.files.find((f) => f.id === tab.activeFileId)?.path ?? null,
      editorTerminalSizes:
        tab?.editorTerminalSizes ?? [...DEFAULT_EDITOR_TERMINAL_SIZES],
    });
  },

  openFile: async (tabId, path, opts) => {
    const tab = get().byTabId[tabId];
    if (!tab) return null;

    const existing = tab.files.find((f) => f.path === path);
    if (existing && !opts?.forceLarge) {
      if (opts?.pin) get().pinFile(tabId, existing.id);
      get().setActiveFile(tabId, existing.id);
      return existing.id;
    }

    const preview = opts?.preview ?? false;
    const mediaKind = mediaKindFromPath(path);

    if (mediaKind) {
      const cached = getCachedMedia(path);
      if (cached && !opts?.forceLarge) {
        const file = createMediaEditorFile(path, cached, preview);
        return insertFileIntoTab(tabId, tab, file, preview);
      }

      const file = createResolvingMediaFile(path, mediaKind, preview);
      const fileId = insertFileIntoTab(
        tabId,
        tab,
        file,
        preview,
        opts?.forceLarge ? path : undefined,
      );
      void hydrateMediaFile(tabId, fileId, path);
      return fileId;
    }

    const settings = useSettingsStore.getState().settings;
    const maxBytes = opts?.forceLarge
      ? settings.editorLargeFileWarningBytes * 5
      : settings.editorLargeFileWarningBytes;

    let payload;
    let modifiedMs = Date.now();
    try {
      const stat = await statFile(path);
      modifiedMs = stat.modifiedMs;
      payload = await readFile(path, maxBytes);
      payload = { ...payload, path: stat.path };
    } catch {
      return null;
    }

    let files = [...tab.files];

    if (preview) {
      const previewIdx = files.findIndex((f) => f.preview);
      if (previewIdx !== -1) files.splice(previewIdx, 1);
    }

    if (opts?.forceLarge) {
      files = files.filter((f) => f.path !== path);
    }

    const file = createEditorFile(path, payload, preview, modifiedMs);
    files.push(file);

    set((s) => ({
      byTabId: updateTab(s.byTabId, tabId, (t) => ({
        ...t,
        files,
        activeFileId: file.id,
      })),
    }));

    return file.id;
  },

  closeFile: (tabId, fileId, force = false) => {
    const tab = get().byTabId[tabId];
    if (!tab) return true;
    const file = tab.files.find((f) => f.id === fileId);
    if (!file) return true;
    if (!force && file.dirty) return false;

    const files = tab.files.filter((f) => f.id !== fileId);
    let activeFileId = tab.activeFileId;
    if (activeFileId === fileId) {
      activeFileId = files.length > 0 ? files[files.length - 1].id : null;
    }

    set((s) => ({
      byTabId: updateTab(s.byTabId, tabId, (t) => ({
        ...t,
        files,
        activeFileId,
      })),
    }));
    return true;
  },

  setActiveFile: (tabId, fileId) => {
    set((s) => ({
      byTabId: updateTab(s.byTabId, tabId, (t) => ({ ...t, activeFileId: fileId })),
    }));
  },

  pinFile: (tabId, fileId) => {
    set((s) => ({
      byTabId: updateTab(s.byTabId, tabId, (t) => ({
        ...t,
        files: t.files.map((f) =>
          f.id === fileId ? { ...f, preview: false } : f,
        ),
      })),
    }));
  },

  setMdViewMode: (tabId, fileId, mode) => {
    set((s) => ({
      byTabId: updateTab(s.byTabId, tabId, (t) => ({
        ...t,
        files: t.files.map((f) =>
          f.id === fileId ? { ...f, mdViewMode: mode } : f,
        ),
      })),
    }));
  },

  updateContent: (tabId, fileId, content) => {
    set((s) => ({
      byTabId: updateTab(s.byTabId, tabId, (t) => ({
        ...t,
        files: t.files.map((f) =>
          f.id === fileId
            ? {
                ...f,
                content,
                dirty: content !== f.savedContent,
                preview: false,
                conflict: f.conflict && content !== f.savedContent,
              }
            : f,
        ),
      })),
    }));
  },

  saveFile: async (tabId, fileId) => {
    const tab = get().byTabId[tabId];
    const file = tab?.files.find((f) => f.id === fileId);
    if (!file || file.encoding !== "utf8") return false;

    try {
      await writeFile(file.path, file.content);
      const stat = await statFile(file.path);
      set((s) => ({
        byTabId: updateTab(s.byTabId, tabId, (t) => ({
          ...t,
          files: t.files.map((f) =>
            f.id === fileId
              ? {
                  ...f,
                  savedContent: f.content,
                  dirty: false,
                  conflict: false,
                  lastModifiedMs: stat.modifiedMs,
                }
              : f,
          ),
        })),
      }));
      return true;
    } catch {
      return false;
    }
  },

  saveActiveFile: async (tabId) => {
    const tab = get().byTabId[tabId];
    if (!tab?.activeFileId) return false;
    return get().saveFile(tabId, tab.activeFileId);
  },

  revertFile: async (tabId, fileId) => {
    const tab = get().byTabId[tabId];
    const file = tab?.files.find((f) => f.id === fileId);
    if (!file) return;

    if (file.encoding === "image" || file.encoding === "video") {
      invalidateMediaCache(file.path);
      try {
        const payload = await resolveMediaPreview(file.path, { force: true });
        set((s) => ({
          byTabId: updateTab(s.byTabId, tabId, (t) => ({
            ...t,
            files: t.files.map((f) =>
              f.id === fileId
                ? {
                    ...applyMediaPayload(f, payload),
                    dirty: false,
                    conflict: false,
                  }
                : f,
            ),
          })),
        }));
      } catch {
        set((s) => ({
          byTabId: updateTab(s.byTabId, tabId, (t) => ({
            ...t,
            files: t.files.map((f) =>
              f.id === fileId ? { ...f, mediaStatus: "error" as const } : f,
            ),
          })),
        }));
      }
      return;
    }

    const [payload, stat] = await Promise.all([
      readFile(file.path),
      statFile(file.path),
    ]);
    set((s) => ({
      byTabId: updateTab(s.byTabId, tabId, (t) => ({
        ...t,
        files: t.files.map((f) =>
          f.id === fileId
            ? {
                ...f,
                content: payload.content,
                savedContent: payload.content,
                dirty: false,
                conflict: false,
                encoding: payload.encoding,
                absolutePath: payload.absolutePath,
                mimeType: payload.mimeType,
                size: payload.size,
                version: f.version + 1,
                lastModifiedMs: stat.modifiedMs,
                mediaStatus: "ready" as const,
              }
            : f,
        ),
      })),
    }));
  },

  setEditorTerminalSizes: (tabId, sizes) => {
    set((s) => ({
      byTabId: updateTab(s.byTabId, tabId, (t) => ({
        ...t,
        editorTerminalSizes: sizes,
      })),
    }));
  },

  toggleExpanded: (tabId, path) => {
    set((s) => ({
      byTabId: updateTab(s.byTabId, tabId, (t) => {
        const expanded = t.expandedPaths.includes(path)
          ? t.expandedPaths.filter((p) => p !== path)
          : [...t.expandedPaths, path];
        return { ...t, expandedPaths: expanded };
      }),
    }));
  },

  setExpandedPaths: (tabId, paths) => {
    set((s) => ({
      byTabId: updateTab(s.byTabId, tabId, (t) => ({ ...t, expandedPaths: paths })),
    }));
  },

  bumpTreeVersion: (tabId) => {
    const root = get().byTabId[tabId]?.rootPath;
    if (root) get().invalidateTreePaths(tabId, [root]);
  },

  invalidateTreePaths: (tabId, paths) => {
    set((s) => ({
      byTabId: updateTab(s.byTabId, tabId, (t) => {
        const dirVersions = { ...t.dirVersions };
        for (const dir of dirsToInvalidate(paths, t.rootPath)) {
          dirVersions[dir] = (dirVersions[dir] ?? 0) + 1;
        }
        return {
          ...t,
          dirVersions,
          treeVersion: t.treeVersion + 1,
        };
      }),
    }));
  },

  handleExternalChange: async (tabId, paths) => {
    get().invalidateTreePaths(tabId, paths);
    const tab = get().byTabId[tabId];
    if (!tab) return;

    for (const file of tab.files) {
      if (!paths.some((p) => p === file.path || p.startsWith(file.path + "/"))) {
        continue;
      }
      if (file.dirty) {
        set((s) => ({
          byTabId: updateTab(s.byTabId, tabId, (t) => ({
            ...t,
            files: t.files.map((f) =>
              f.id === file.id ? { ...f, conflict: true } : f,
            ),
          })),
        }));
        continue;
      }
      try {
        if (file.encoding === "image" || file.encoding === "video") {
          invalidateMediaCache(file.path);
          const payload = await resolveMediaPreview(file.path, { force: true });
          set((s) => ({
            byTabId: updateTab(s.byTabId, tabId, (t) => ({
              ...t,
              files: t.files.map((f) =>
                f.id === file.id ? applyMediaPayload(f, payload) : f,
              ),
            })),
          }));
          continue;
        }
        const payload = await readFile(file.path);
        const stat = await statFile(file.path);
        set((s) => ({
          byTabId: updateTab(s.byTabId, tabId, (t) => ({
            ...t,
            files: t.files.map((f) =>
              f.id === file.id
                ? {
                    ...f,
                    content: payload.content,
                    savedContent: payload.content,
                    encoding: payload.encoding,
                    absolutePath: payload.absolutePath,
                    mimeType: payload.mimeType,
                    size: payload.size,
                    version: f.version + 1,
                    lastModifiedMs: stat.modifiedMs,
                    mediaStatus: "ready" as const,
                  }
                : f,
            ),
          })),
        }));
      } catch {
        // file may have been deleted
      }
    }
  },

  resolveConflict: async (tabId, fileId, choice) => {
    if (choice === "keep") {
      set((s) => ({
        byTabId: updateTab(s.byTabId, tabId, (t) => ({
          ...t,
          files: t.files.map((f) =>
            f.id === fileId ? { ...f, conflict: false } : f,
          ),
        })),
      }));
      return;
    }
    if (choice === "saveAndReload") {
      await get().saveFile(tabId, fileId);
    }
    await get().revertFile(tabId, fileId);
  },

  destroyTabEditor: async (tabId) => {
    const tab = get().byTabId[tabId];
    if (tab?.watchId) await stopWatch(tab.watchId);
    set((s) => {
      const { [tabId]: _, ...rest } = s.byTabId;
      return { byTabId: rest };
    });
  },

  hasDirtyFiles: (tabId) => {
    const tab = get().byTabId[tabId];
    return tab?.files.some((f) => f.dirty) ?? false;
  },

  getPersistedState: () => {
    const result: Record<string, PersistedTabEditor> = {};
    for (const [tabId, state] of Object.entries(get().byTabId)) {
      if (state.files.length > 0 || state.expandedPaths.length > 0) {
        result[tabId] = toPersistedTabEditor(state);
      }
    }
    return result;
  },

  restorePersisted: (editorByTabId) => {
    for (const [tabId, persisted] of Object.entries(editorByTabId)) {
      void get().initTabEditor(tabId, persisted.rootPath, persisted);
    }
  },
}));

// ponytail: self-check — empty editor state has no dirty files
if (import.meta.env.DEV) {
  const s = emptyTabEditorState("~");
  console.assert(s.files.length === 0 && s.watchId === null);
}
