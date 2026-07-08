import { useMemo } from "react";
import { TabItem } from "@/components/sidebar/TabItem";
import { useTabStore } from "@/stores/useTabStore";

interface TabListProps {
  query?: string;
}

export function TabList({ query = "" }: TabListProps) {
  const tabs = useTabStore((s) => s.tabs);
  const activeTabId = useTabStore((s) => s.activeTabId);
  const setActiveTab = useTabStore((s) => s.setActiveTab);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tabs;
    return tabs.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        (t.cwd ?? "~").toLowerCase().includes(q),
    );
  }, [tabs, query]);

  if (filtered.length === 0) {
    return (
      <p className="px-3 py-6 text-center text-sm text-sidebar-muted">
        No sessions found
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-0.5">
      {filtered.map((tab, index) => (
        <TabItem
          key={tab.id}
          tab={tab}
          index={index}
          isActive={tab.id === activeTabId}
          onSelect={() => setActiveTab(tab.id)}
        />
      ))}
    </div>
  );
}
