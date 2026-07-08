import { useEffect } from "react";
import { useTabStore } from "@/stores/useTabStore";

export function useKeyboardShortcuts(onOpenHistory?: () => void) {
  const { tabs, activeTabId, addTab, removeTab, setActiveTab } = useTabStore();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;

      if (mod && e.key === "t") {
        e.preventDefault();
        addTab();
        return;
      }

      if (mod && e.key === "w") {
        e.preventDefault();
        if (activeTabId) removeTab(activeTabId);
        return;
      }

      if (mod && e.key === "Tab") {
        e.preventDefault();
        if (tabs.length === 0) return;
        const idx = tabs.findIndex((t) => t.id === activeTabId);
        const next = e.shiftKey
          ? (idx - 1 + tabs.length) % tabs.length
          : (idx + 1) % tabs.length;
        setActiveTab(tabs[next].id);
        return;
      }

      if (mod && e.shiftKey && e.key === "H") {
        e.preventDefault();
        onOpenHistory?.();
        return;
      }

      if (mod && e.key >= "1" && e.key <= "9") {
        const index = parseInt(e.key, 10) - 1;
        if (tabs[index]) {
          e.preventDefault();
          setActiveTab(tabs[index].id);
        }
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [tabs, activeTabId, addTab, removeTab, setActiveTab, onOpenHistory]);
}
