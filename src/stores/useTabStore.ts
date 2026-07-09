import { create } from "zustand";
import type { LayoutPresetId } from "@/lib/layout-presets";
import { buildLayoutPreset } from "@/lib/layout-presets";
import type { SplitDirection } from "@/types/layout";
import type { Tab, TabOpenOptions, TabStatus } from "@/types/tab";
import type { WorkspaceTab } from "@/types/workspace";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { tabNameFromCwd } from "@/lib/folders";
import { recordRecentDir } from "@/lib/recentDirs";
import type { PersistedTabEditor } from "@/types/editor";
import { loadPersistedSession } from "@/lib/sessionPersist";
import { useEditorStore } from "@/stores/useEditorStore";
import {
  collectPaneIds,
  createPane,
  focusAdjacentPane,
  getFocusedPane,
  removePaneFromLayout,
  singlePaneLayout,
  splitLayout,
  updateSplitSizes,
} from "@/lib/layout";

const MAX_COMMAND_RUNS = 50;

function editorCwdForTab(tab: Tab): string {
  return getFocusedPane(tab).cwd ?? "~";
}

async function initEditorForTab(
  tabId: string,
  cwd: string,
  restored?: PersistedTabEditor,
) {
  await useEditorStore.getState().initTabEditor(tabId, cwd, restored);
}

function deferInitEditorForTab(
  tabId: string,
  cwd: string,
  restored?: PersistedTabEditor,
) {
  const run = () => void initEditorForTab(tabId, cwd, restored);
  if (typeof requestIdleCallback !== "undefined") {
    requestIdleCallback(run);
  } else {
    setTimeout(run, 0);
  }
}

function syncEditorRoot(tabId: string) {
  const tab = useTabStore.getState().tabs.find((t) => t.id === tabId);
  if (!tab) return;
  void useEditorStore.getState().setRootPath(tabId, editorCwdForTab(tab));
}

interface TabStore {
  tabs: Tab[];
  closedTabs: Tab[];
  activeTabId: string | null;
  addTab: (name?: string, cwd?: string, opts?: TabOpenOptions) => string;
  removeTab: (id: string) => void;
  reopenClosedTab: (closedId: string) => string | null;
  reopenLastClosedTab: () => string | null;
  setActiveTab: (id: string) => void;
  setPaneStatus: (tabId: string, paneId: string, status: TabStatus) => void;
  setPaneSessionId: (tabId: string, paneId: string, sessionId: string) => void;
  setPaneCwd: (tabId: string, paneId: string, cwd: string) => void;
  setPaneBranch: (tabId: string, paneId: string, branch: string | null) => void;
  renameTab: (id: string, name: string) => void;
  renamingTabId: string | null;
  setRenamingTabId: (id: string | null) => void;
  appendCommand: (tabId: string, paneId: string, command: string) => void;
  startCommandRun: (tabId: string, paneId: string, command: string) => void;
  finishCommandRun: (tabId: string, paneId: string, exitCode: number) => void;
  getActiveTab: () => Tab | undefined;
  splitPane: (tabId: string, direction: SplitDirection) => void;
  closePane: (tabId: string, paneId: string) => void;
  togglePaneMinimized: (tabId: string, paneId: string) => void;
  setFocusedPane: (tabId: string, paneId: string) => void;
  resizeSplit: (tabId: string, path: number[], sizes: number[]) => void;
  focusAdjacentPane: (tabId: string, direction: "next" | "prev") => void;
  addTabWithLayoutPreset: (preset: LayoutPresetId, cwd?: string, name?: string) => string;
  toggleBroadcast: (tabId: string) => void;
  replaceAllTabs: (entries: WorkspaceTab[]) => void;
}

function syncTabName(tab: Tab): Tab {
  const pane = getFocusedPane(tab);
  if (pane.sshHost) return tab;
  const name = tabNameFromCwd(pane.cwd);
  return tab.name === name ? tab : { ...tab, name };
}

function createTab(
  name?: string,
  cwd?: string,
  opts?: TabOpenOptions,
): Tab {
  const defaultCwd = useSettingsStore.getState().settings.defaultCwd || "~";
  const resolvedCwd = cwd ?? defaultCwd;
  const pane = createPane(resolvedCwd, opts);
  const tab: Tab = {
    id: crypto.randomUUID(),
    name: name ?? tabNameFromCwd(resolvedCwd),
    layout: singlePaneLayout(pane.id),
    panes: { [pane.id]: pane },
    focusedPaneId: pane.id,
  };
  return syncTabName(tab);
}

function remapTabPaneIds(source: {
  layout: Tab["layout"];
  panes: Tab["panes"];
  focusedPaneId: string;
  name: string;
  id?: string;
}): Tab {
  const paneIds = collectPaneIds(source.layout);
  const panes: Tab["panes"] = {};
  const idMap = new Map<string, string>();

  for (const oldId of paneIds) {
    const old = source.panes[oldId];
    const newId = crypto.randomUUID();
    idMap.set(oldId, newId);
    panes[newId] = {
      ...old,
      id: newId,
      sessionId: undefined,
      status: "neutral",
      initialCommand: old.initialCommand,
      commandHistory: old.commandHistory ?? [],
      commandRuns: (old.commandRuns ?? []).filter((r) => r.status !== "running"),
    };
  }

  const remap = (node: Tab["layout"]): Tab["layout"] => {
    if (node.type === "pane") {
      return { type: "pane", paneId: idMap.get(node.paneId) ?? node.paneId };
    }
    return {
      ...node,
      children: node.children.map(remap),
    };
  };

  return {
    id: source.id ?? crypto.randomUUID(),
    name: source.name,
    layout: remap(source.layout),
    panes,
    focusedPaneId: idMap.get(source.focusedPaneId) ?? Object.keys(panes)[0],
    broadcast: false,
  };
}

function reopenFromClosed(closed: Tab): Tab {
  return remapTabPaneIds({ ...closed, id: crypto.randomUUID() });
}

function tabFromWorkspaceEntry(entry: WorkspaceTab): Tab {
  if (entry.layout && entry.panes && entry.focusedPaneId) {
    const panes: Tab["panes"] = {};
    for (const [paneId, snap] of Object.entries(entry.panes)) {
      panes[paneId] = {
        ...createPane(snap.cwd, {
          initialCommand: snap.initialCommand,
          sshHost: snap.sshHost,
        }),
        id: paneId,
        minimized: snap.minimized,
      };
    }
    return syncTabName(
      remapTabPaneIds({
        name: entry.name,
        layout: entry.layout,
        panes,
        focusedPaneId: entry.focusedPaneId,
      }),
    );
  }

  return createTab(entry.name, entry.cwd ?? "~");
}

function updatePane(
  tab: Tab,
  paneId: string,
  updater: (pane: Tab["panes"][string]) => Tab["panes"][string],
): Tab {
  const pane = tab.panes[paneId];
  if (!pane) return tab;
  return {
    ...tab,
    panes: { ...tab.panes, [paneId]: updater(pane) },
  };
}

export const useTabStore = create<TabStore>((set, get) => ({
  tabs: [createTab()],
  closedTabs: [],
  activeTabId: null,
  renamingTabId: null,

  addTab: (name, cwd, opts) => {
    const tab = createTab(name, cwd, opts);
    set((state) => ({
      tabs: [...state.tabs, tab],
      activeTabId: tab.id,
    }));
    void initEditorForTab(tab.id, editorCwdForTab(tab));
    return tab.id;
  },

  addTabWithLayoutPreset: (preset, cwd, name) => {
    const defaultCwd = useSettingsStore.getState().settings.defaultCwd || "~";
    const resolvedCwd = cwd ?? defaultCwd;
    const built = buildLayoutPreset(preset, resolvedCwd);
    const tab: Tab = syncTabName({
      id: crypto.randomUUID(),
      name: name ?? tabNameFromCwd(resolvedCwd),
      layout: built.layout,
      panes: built.panes,
      focusedPaneId: built.focusedPaneId,
    });
    set((state) => ({
      tabs: [...state.tabs, tab],
      activeTabId: tab.id,
    }));
    void initEditorForTab(tab.id, editorCwdForTab(tab));
    return tab.id;
  },

  removeTab: (id) => {
    const editor = useEditorStore.getState();
    if (editor.hasDirtyFiles(id)) {
      const ok = window.confirm(
        "This session has unsaved files. Close anyway?",
      );
      if (!ok) return;
    }
    void editor.destroyTabEditor(id);
    set((state) => {
      const index = state.tabs.findIndex((t) => t.id === id);
      if (index === -1) return state;

      const closed = state.tabs[index];
      const maxClosed = useSettingsStore.getState().settings.maxClosedTabs;
      const closedTabs = [closed, ...state.closedTabs].slice(0, maxClosed);
      const tabs = state.tabs.filter((t) => t.id !== id);

      if (tabs.length === 0) {
        return { tabs, activeTabId: null, closedTabs };
      }

      let activeTabId = state.activeTabId;
      if (activeTabId === id) {
        const nextIndex = Math.min(index, tabs.length - 1);
        activeTabId = tabs[nextIndex].id;
      }

      return { tabs, activeTabId, closedTabs };
    });
  },

  reopenClosedTab: (closedId) => {
    let reopenedId: string | null = null;
    set((state) => {
      const closed = state.closedTabs.find((t) => t.id === closedId);
      if (!closed) return state;

      const tab = reopenFromClosed(closed);
      reopenedId = tab.id;
      return {
        tabs: [...state.tabs, tab],
        activeTabId: tab.id,
        closedTabs: state.closedTabs.filter((t) => t.id !== closedId),
      };
    });
    if (reopenedId) {
      const tab = useTabStore.getState().tabs.find((t) => t.id === reopenedId);
      if (tab) void initEditorForTab(reopenedId, editorCwdForTab(tab));
    }
    return reopenedId;
  },

  reopenLastClosedTab: () => {
    const { closedTabs } = get();
    if (closedTabs.length === 0) return null;
    return get().reopenClosedTab(closedTabs[0].id);
  },

  setActiveTab: (id) => {
    set((state) => {
      if (state.activeTabId === id) return state;
      const tab = state.tabs.find((t) => t.id === id);
      if (!tab) return state;
      const pane = getFocusedPane(tab);
      return {
        activeTabId: id,
        tabs: state.tabs.map((t) => {
          if (t.id !== id) return t;
          if (pane.status === "neutral") return t;
          return updatePane(t, pane.id, (p) => ({ ...p, status: "neutral" }));
        }),
      };
    });
    syncEditorRoot(id);
  },

  setPaneStatus: (tabId, paneId, status) =>
    set((state) => {
      const tab = state.tabs.find((t) => t.id === tabId);
      const pane = tab?.panes[paneId];
      if (!pane || pane.status === status) return state;
      return {
        tabs: state.tabs.map((t) =>
          t.id === tabId
            ? updatePane(t, paneId, (p) => ({ ...p, status }))
            : t,
        ),
      };
    }),

  setPaneSessionId: (tabId, paneId, sessionId) =>
    set((state) => {
      const tab = state.tabs.find((t) => t.id === tabId);
      const pane = tab?.panes[paneId];
      if (!pane || pane.sessionId === sessionId) return state;
      return {
        tabs: state.tabs.map((t) =>
          t.id === tabId
            ? updatePane(t, paneId, (p) => ({ ...p, sessionId }))
            : t,
        ),
      };
    }),

  setPaneCwd: (tabId, paneId, cwd) => {
    const tab = get().tabs.find((t) => t.id === tabId);
    const pane = tab?.panes[paneId];
    if (pane?.cwd === cwd) return;

    recordRecentDir(cwd);
    set((state) => ({
      tabs: state.tabs.map((t) => {
        if (t.id !== tabId) return t;
        const updated = updatePane(t, paneId, (p) => ({ ...p, cwd }));
        return paneId === updated.focusedPaneId ? syncTabName(updated) : updated;
      }),
    }));
    const updatedTab = get().tabs.find((t) => t.id === tabId);
    if (updatedTab && updatedTab.focusedPaneId === paneId) {
      void useEditorStore.getState().setRootPath(tabId, cwd);
    }
  },

  setPaneBranch: (tabId, paneId, branch) =>
    set((state) => {
      const tab = state.tabs.find((t) => t.id === tabId);
      const pane = tab?.panes[paneId];
      if (!pane || pane.branch === branch) return state;
      return {
        tabs: state.tabs.map((t) =>
          t.id === tabId
            ? updatePane(t, paneId, (p) => ({ ...p, branch }))
            : t,
        ),
      };
    }),

  renameTab: (id, name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    set((state) => ({
      tabs: state.tabs.map((t) => (t.id === id ? { ...t, name: trimmed } : t)),
      renamingTabId: null,
    }));
  },

  setRenamingTabId: (id) => set({ renamingTabId: id }),

  appendCommand: (tabId, paneId, command) => {
    const trimmed = command.trim();
    if (!trimmed) return;
    set((state) => ({
      tabs: state.tabs.map((t) =>
        t.id === tabId
          ? updatePane(t, paneId, (p) => ({
              ...p,
              commandHistory: [...p.commandHistory, trimmed],
            }))
          : t,
      ),
    }));
  },

  startCommandRun: (tabId, paneId, command) => {
    const trimmed = command.trim();
    if (!trimmed) return;
    set((state) => ({
      tabs: state.tabs.map((t) =>
        t.id === tabId
          ? updatePane(t, paneId, (p) => ({
              ...p,
              commandHistory: p.commandHistory.includes(trimmed)
                ? p.commandHistory
                : [...p.commandHistory, trimmed],
              commandRuns: [
                ...p.commandRuns.filter((r) => r.status !== "running"),
                {
                  id: crypto.randomUUID(),
                  command: trimmed,
                  startedAt: Date.now(),
                  status: "running" as const,
                },
              ].slice(-MAX_COMMAND_RUNS),
            }))
          : t,
      ),
    }));
  },

  finishCommandRun: (tabId, paneId, exitCode) =>
    set((state) => ({
      tabs: state.tabs.map((t) => {
        if (t.id !== tabId) return t;
        return updatePane(t, paneId, (p) => {
          const runs = [...p.commandRuns];
          let idx = -1;
          for (let i = runs.length - 1; i >= 0; i--) {
            if (runs[i].status === "running") {
              idx = i;
              break;
            }
          }
          if (idx === -1) return p;
          runs[idx] = {
            ...runs[idx],
            status: exitCode === 0 ? "success" : "error",
            exitCode,
          };
          return { ...p, commandRuns: runs };
        });
      }),
    })),

  getActiveTab: () => {
    const { tabs, activeTabId } = get();
    return tabs.find((t) => t.id === activeTabId);
  },

  splitPane: (tabId, direction) => {
    set((state) => ({
      tabs: state.tabs.map((t) => {
        if (t.id !== tabId) return t;
        const focused = getFocusedPane(t);
        const newPane = createPane(focused.cwd);
        return syncTabName({
          ...t,
          layout: splitLayout(t.layout, focused.id, direction, newPane.id),
          panes: { ...t.panes, [newPane.id]: newPane },
          focusedPaneId: newPane.id,
        });
      }),
    }));
  },

  closePane: (tabId, paneId) => {
    const state = get();
    const tab = state.tabs.find((t) => t.id === tabId);
    if (!tab) return;

    const paneCount = Object.keys(tab.panes).length;
    if (paneCount <= 1) {
      get().removeTab(tabId);
      return;
    }

    const newLayout = removePaneFromLayout(tab.layout, paneId);
    if (!newLayout) {
      get().removeTab(tabId);
      return;
    }

    const remainingIds = collectPaneIds(newLayout);
    const newFocused = remainingIds.includes(tab.focusedPaneId)
      ? tab.focusedPaneId
      : remainingIds[0];

    const { [paneId]: _, ...restPanes } = tab.panes;

    set((s) => ({
      tabs: s.tabs.map((t) =>
        t.id === tabId
          ? {
              ...t,
              layout: newLayout,
              panes: restPanes,
              focusedPaneId: newFocused,
            }
          : t,
      ),
    }));
  },

  togglePaneMinimized: (tabId, paneId) =>
    set((state) => ({
      tabs: state.tabs.map((t) =>
        t.id === tabId
          ? updatePane(t, paneId, (p) => ({ ...p, minimized: !p.minimized }))
          : t,
      ),
    })),

  toggleBroadcast: (tabId) =>
    set((state) => ({
      tabs: state.tabs.map((t) =>
        t.id === tabId ? { ...t, broadcast: !t.broadcast } : t,
      ),
    })),

  setFocusedPane: (tabId, paneId) => {
    set((state) => ({
      tabs: state.tabs.map((t) =>
        t.id === tabId ? syncTabName({ ...t, focusedPaneId: paneId }) : t,
      ),
      activeTabId: tabId,
    }));
    syncEditorRoot(tabId);
  },

  focusAdjacentPane: (tabId, direction) => {
    const tab = get().tabs.find((t) => t.id === tabId);
    if (!tab) return;
    const nextId = focusAdjacentPane(tab.layout, tab.focusedPaneId, direction);
    if (!nextId || nextId === tab.focusedPaneId) return;
    get().setFocusedPane(tabId, nextId);
  },

  resizeSplit: (tabId, path, sizes) =>
    set((state) => ({
      tabs: state.tabs.map((t) =>
        t.id === tabId
          ? { ...t, layout: updateSplitSizes(t.layout, path, sizes) }
          : t,
      ),
    })),

  replaceAllTabs: (entries) => {
    const prev = get().tabs;
    for (const tab of prev) {
      void useEditorStore.getState().destroyTabEditor(tab.id);
    }
    const tabs = entries.map((e) => tabFromWorkspaceEntry(e));
    if (tabs.length === 0) {
      set({ tabs: [], activeTabId: null });
      return;
    }
    set({ tabs, activeTabId: tabs[0].id });
    entries.forEach((entry, i) => {
      const tab = tabs[i];
      const cwd = editorCwdForTab(tab);
      void useEditorStore
        .getState()
        .initTabEditor(tab.id, cwd, entry.editor);
    });
  },
}));

const persisted =
  useSettingsStore.getState().settings.restoreSessionOnLaunch
    ? loadPersistedSession()
    : null;
const bootstrap = persisted?.tabs.length
  ? {
      tabs: persisted.tabs,
      closedTabs: persisted.closedTabs,
      activeTabId:
        persisted.activeTabId &&
        persisted.tabs.some((t) => t.id === persisted.activeTabId)
          ? persisted.activeTabId
          : persisted.tabs[0].id,
    }
  : null;

if (bootstrap) {
  useTabStore.setState(bootstrap);
  const editorByTabId = persisted?.editorByTabId;
  for (const tab of bootstrap.tabs) {
    try {
      const cwd = editorCwdForTab(tab);
      const restored = editorByTabId?.[tab.id];
      if (tab.id === bootstrap.activeTabId) {
        void initEditorForTab(tab.id, cwd, restored);
      } else {
        deferInitEditorForTab(tab.id, cwd, restored);
      }
    } catch (err) {
      console.warn("Failed to init editor for restored tab:", tab.id, err);
    }
  }
} else {
  const initial = useTabStore.getState();
  if (!initial.activeTabId && initial.tabs[0]) {
    useTabStore.setState({ activeTabId: initial.tabs[0].id });
    void initEditorForTab(initial.tabs[0].id, editorCwdForTab(initial.tabs[0]));
  }
}

export function getTabDisplayMeta(tab: Tab) {
  const pane = getFocusedPane(tab);
  return {
    cwd: pane.cwd,
    branch: pane.branch,
    status: pane.status,
    sshHost: pane.sshHost,
  };
}

export function getGlobalCommandHistory(tabs: Tab[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const tab of tabs) {
    for (const pane of Object.values(tab.panes)) {
      for (let i = pane.commandHistory.length - 1; i >= 0; i--) {
        const cmd = pane.commandHistory[i];
        if (!seen.has(cmd)) {
          seen.add(cmd);
          result.push(cmd);
        }
      }
    }
  }
  return result;
}
