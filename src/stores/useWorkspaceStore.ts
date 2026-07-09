import { create } from "zustand";
import type { Workspace, WorkspaceTab } from "@/types/workspace";
import { useEditorStore } from "@/stores/useEditorStore";
import { toPersistedTabEditor } from "@/types/editor";
import { useTabStore } from "@/stores/useTabStore";

const STORAGE_KEY = "wisp-workspaces";

function loadWorkspaces(): Workspace[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveWorkspaces(workspaces: Workspace[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(workspaces));
}

function tabToWorkspaceEntry(tab: ReturnType<typeof useTabStore.getState>["tabs"][number]): WorkspaceTab {
  const panes: WorkspaceTab["panes"] = {};
  for (const [id, pane] of Object.entries(tab.panes)) {
    panes[id] = {
      cwd: pane.cwd ?? "~",
      sshHost: pane.sshHost,
      minimized: pane.minimized,
      initialCommand:
        [...pane.commandRuns].reverse().find((r) => r.status === "success")
          ?.command ??
        (pane.commandHistory.length > 0
          ? pane.commandHistory[pane.commandHistory.length - 1]
          : undefined),
    };
  }
  return {
    name: tab.name,
    layout: tab.layout,
    panes,
    focusedPaneId: tab.focusedPaneId,
    editor: (() => {
      const editor = useEditorStore.getState().byTabId[tab.id];
      return editor ? toPersistedTabEditor(editor) : undefined;
    })(),
  };
}

interface WorkspaceStore {
  workspaces: Workspace[];
  saveWorkspace: (name: string) => Workspace;
  deleteWorkspace: (id: string) => void;
  restoreWorkspace: (id: string) => void;
}

export const useWorkspaceStore = create<WorkspaceStore>((set, get) => ({
  workspaces: loadWorkspaces(),

  saveWorkspace: (name) => {
    const tabs = useTabStore.getState().tabs;
    const entries: WorkspaceTab[] = tabs.map(tabToWorkspaceEntry);
    const workspace: Workspace = {
      id: crypto.randomUUID(),
      name: name.trim() || "Untitled",
      tabs: entries,
    };
    const workspaces = [workspace, ...get().workspaces];
    saveWorkspaces(workspaces);
    set({ workspaces });
    return workspace;
  },

  deleteWorkspace: (id) => {
    const workspaces = get().workspaces.filter((w) => w.id !== id);
    saveWorkspaces(workspaces);
    set({ workspaces });
  },

  restoreWorkspace: (id) => {
    const workspace = get().workspaces.find((w) => w.id === id);
    if (!workspace) return;
    useTabStore.getState().replaceAllTabs(workspace.tabs);
  },
}));
