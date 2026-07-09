import type { Tab } from "@/types/tab";
import type { PersistedTabEditor } from "@/types/editor";

const STORAGE_KEY = "wisp-session";

export interface PersistedSession {
  tabs: Tab[];
  activeTabId: string | null;
  closedTabs: Tab[];
  editorByTabId?: Record<string, PersistedTabEditor>;
}

function stripEphemeralPaneState(tab: Tab): Tab {
  const panes: Tab["panes"] = {};
  for (const [id, pane] of Object.entries(tab.panes)) {
    panes[id] = {
      ...pane,
      sessionId: undefined,
      status: "neutral",
      initialCommand: undefined,
      commandRuns: (pane.commandRuns ?? []).filter((r) => r.status !== "running"),
    };
  }
  return { ...tab, panes, broadcast: false };
}

function repairTab(tab: Tab): Tab | null {
  const paneIds = Object.keys(tab.panes);
  if (paneIds.length === 0) return null;
  const focusedPaneId = tab.panes[tab.focusedPaneId]
    ? tab.focusedPaneId
    : paneIds[0];
  return stripEphemeralPaneState({ ...tab, focusedPaneId });
}

function sanitizeTabs(tabs: Tab[]): Tab[] {
  return tabs
    .map(repairTab)
    .filter((tab): tab is Tab => tab !== null);
}

export function loadPersistedSession(): PersistedSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedSession;
    if (!parsed || !Array.isArray(parsed.tabs)) return null;
    const tabs = sanitizeTabs(
      parsed.tabs.map((tab) => ({
        ...tab,
        panes: Object.fromEntries(
          Object.entries(tab.panes).map(([id, pane]) => [
            id,
            {
              ...pane,
              commandHistory: pane.commandHistory ?? [],
              commandRuns: pane.commandRuns ?? [],
            },
          ]),
        ),
      })),
    );
    if (tabs.length === 0) return null;
    return {
      tabs,
      activeTabId: parsed.activeTabId ?? null,
      closedTabs: sanitizeTabs(parsed.closedTabs ?? []),
      editorByTabId: parsed.editorByTabId ?? {},
    };
  } catch {
    return null;
  }
}

let lastSnapshot = "";

export function savePersistedSession(session: PersistedSession) {
  const payload = JSON.stringify({
    tabs: sanitizeTabs(session.tabs),
    activeTabId: session.activeTabId,
    closedTabs: sanitizeTabs(session.closedTabs),
    editorByTabId: session.editorByTabId ?? {},
  });
  if (payload === lastSnapshot) return;
  lastSnapshot = payload;
  localStorage.setItem(STORAGE_KEY, payload);
}

let persistTimer: ReturnType<typeof setTimeout> | null = null;

export function scheduleSessionPersist(
  getSession: () => PersistedSession,
  enabled: () => boolean,
) {
  if (!enabled()) return;
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    savePersistedSession(getSession());
  }, 500);
}
