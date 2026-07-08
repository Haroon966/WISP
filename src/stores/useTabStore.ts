import { create } from "zustand";
import type { Tab, TabStatus } from "@/types/tab";

interface TabStore {
  tabs: Tab[];
  activeTabId: string | null;
  addTab: (name?: string) => string;
  removeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  setTabStatus: (id: string, status: TabStatus) => void;
  setTabSessionId: (id: string, sessionId: string) => void;
  setTabCwd: (id: string, cwd: string) => void;
  setTabBranch: (id: string, branch: string | null) => void;
  appendCommand: (id: string, command: string) => void;
  getActiveTab: () => Tab | undefined;
}

let sessionCounter = 0;

function createTab(name?: string): Tab {
  sessionCounter += 1;
  return {
    id: crypto.randomUUID(),
    name: name ?? `Session ${sessionCounter}`,
    status: "neutral",
    cwd: "~",
    commandHistory: [],
  };
}

export const useTabStore = create<TabStore>((set, get) => ({
  tabs: [createTab()],
  activeTabId: null,

  addTab: (name) => {
    const tab = createTab(name);
    set((state) => ({
      tabs: [...state.tabs, tab],
      activeTabId: tab.id,
    }));
    return tab.id;
  },

  removeTab: (id) => {
    set((state) => {
      const index = state.tabs.findIndex((t) => t.id === id);
      if (index === -1) return state;

      const tabs = state.tabs.filter((t) => t.id !== id);
      if (tabs.length === 0) {
        const tab = createTab();
        return { tabs: [tab], activeTabId: tab.id };
      }

      let activeTabId = state.activeTabId;
      if (activeTabId === id) {
        const nextIndex = Math.min(index, tabs.length - 1);
        activeTabId = tabs[nextIndex].id;
      }

      return { tabs, activeTabId };
    });
  },

  setActiveTab: (id) =>
    set((state) => {
      if (state.activeTabId === id) return state;
      return {
        activeTabId: id,
        tabs: state.tabs.map((t) =>
          t.id === id && t.status !== "neutral"
            ? { ...t, status: "neutral" as const }
            : t,
        ),
      };
    }),

  setTabStatus: (id, status) =>
    set((state) => ({
      tabs: state.tabs.map((t) => (t.id === id ? { ...t, status } : t)),
    })),

  setTabSessionId: (id, sessionId) =>
    set((state) => ({
      tabs: state.tabs.map((t) => (t.id === id ? { ...t, sessionId } : t)),
    })),

  setTabCwd: (id, cwd) =>
    set((state) => ({
      tabs: state.tabs.map((t) => (t.id === id ? { ...t, cwd } : t)),
    })),

  setTabBranch: (id, branch) =>
    set((state) => ({
      tabs: state.tabs.map((t) => (t.id === id ? { ...t, branch } : t)),
    })),

  appendCommand: (id, command) => {
    const trimmed = command.trim();
    if (!trimmed) return;
    set((state) => ({
      tabs: state.tabs.map((t) =>
        t.id === id
          ? { ...t, commandHistory: [...t.commandHistory, trimmed] }
          : t,
      ),
    }));
  },

  getActiveTab: () => {
    const { tabs, activeTabId } = get();
    return tabs.find((t) => t.id === activeTabId);
  },
}));

// ponytail: set initial active tab once on module load
const initial = useTabStore.getState();
if (!initial.activeTabId && initial.tabs[0]) {
  useTabStore.setState({ activeTabId: initial.tabs[0].id });
}
