import { useEffect, useMemo, useState } from "react";
import { ChevronDownIcon, ChevronRightIcon } from "lucide-react";
import { TabItem } from "@/components/sidebar/TabItem";
import { useTabStore } from "@/stores/useTabStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { useFuseTabSearch } from "@/hooks/useGlobalSearchItems";
import { projectNameFromRoot } from "@/lib/fs";
import { useRepoRoots } from "@/lib/repoRootCache";
import { syncPaneGitBranch } from "@/lib/git";
import { getFocusedPane } from "@/lib/layout";
import type { Tab } from "@/types/tab";

interface TabListProps {
  query?: string;
  iconOnly?: boolean;
  onSessionSelect?: () => void;
}

interface TabGroup {
  key: string;
  label: string;
  tabs: Tab[];
}

export function TabList({ query = "", iconOnly = false, onSessionSelect }: TabListProps) {
  const tabs = useTabStore((s) => s.tabs);
  const closedTabs = useTabStore((s) => s.closedTabs);
  const activeTabId = useTabStore((s) => s.activeTabId);
  const setActiveTab = useTabStore((s) => s.setActiveTab);
  const removeTab = useTabStore((s) => s.removeTab);
  const repoRoots = useRepoRoots(tabs);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const cwdKey = useMemo(
    () =>
      tabs
        .map((t) => {
          const p = getFocusedPane(t);
          return `${t.id}:${p.id}:${p.cwd ?? ""}`;
        })
        .join("|"),
    [tabs],
  );

  useEffect(() => {
    for (const tab of tabs) {
      const pane = getFocusedPane(tab);
      if (!pane.cwd) continue;
      void syncPaneGitBranch(tab.id, pane.id, pane.cwd);
    }
  }, [cwdKey, tabs]);

  const filtered = useFuseTabSearch(tabs, query);

  const groups = useMemo((): TabGroup[] => {
    const byKey = new Map<string, TabGroup>();
    for (const tab of filtered) {
      const root = repoRoots[tab.id];
      const key = root ?? "__other__";
      const label = root ? projectNameFromRoot(root) : "Other";
      const existing = byKey.get(key);
      if (existing) {
        existing.tabs.push(tab);
      } else {
        byKey.set(key, { key, label, tabs: [tab] });
      }
    }
    return Array.from(byKey.values()).sort((a, b) => {
      if (a.key === "__other__") return 1;
      if (b.key === "__other__") return -1;
      return a.label.localeCompare(b.label);
    });
  }, [filtered, repoRoots]);

  const showGroups = groups.length > 1 && !query.trim() && !iconOnly;

  if (tabs.length === 0) {
    if (iconOnly) return null;
    return (
      <div className="px-3 py-8 text-center">
        <p className="text-sm text-sidebar-muted">
          {closedTabs.length > 0
            ? "No open sessions"
            : "No sessions yet"}
        </p>
        <p className="mt-1 text-xs text-sidebar-muted/80">
          {closedTabs.length > 0
            ? "History → Sessions to reopen"
            : "Press + to start"}
        </p>
      </div>
    );
  }

  if (filtered.length === 0) {
    if (iconOnly) return null;
    return (
      <p className="px-3 py-6 text-center text-sm text-sidebar-muted">
        No sessions found
      </p>
    );
  }

  const renderTab = (tab: Tab) => (
    <TabItem
      key={tab.id}
      tab={tab}
      isActive={tab.id === activeTabId}
      iconOnly={iconOnly}
      onSelect={() => {
        setActiveTab(tab.id);
        onSessionSelect?.();
      }}
      onClose={() => {
        const { confirmCloseTab } = useSettingsStore.getState().settings;
        if (confirmCloseTab && !window.confirm(`Close "${tab.name}"?`)) return;
        removeTab(tab.id);
      }}
    />
  );

  if (!showGroups) {
    return (
      <div className="flex flex-col gap-0.5">{filtered.map(renderTab)}</div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {groups.map((group) => {
        const isCollapsed = collapsed[group.key] ?? false;
        return (
          <div key={group.key}>
            <button
              type="button"
              onClick={() =>
                setCollapsed((c) => ({ ...c, [group.key]: !isCollapsed }))
              }
              className="flex w-full cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-sidebar-muted transition-colors duration-200 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
            >
              {isCollapsed ? (
                <ChevronRightIcon className="size-3.5" />
              ) : (
                <ChevronDownIcon className="size-3.5" />
              )}
              {group.label}
              <span className="ml-auto tabular-nums">{group.tabs.length}</span>
            </button>
            {!isCollapsed ? (
              <div className="flex flex-col gap-0.5">{group.tabs.map(renderTab)}</div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
