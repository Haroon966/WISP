import { useEffect } from "react";
import { getFocusedPane } from "@/lib/layout";
import { isTerminalFocused } from "@/lib/terminalClipboard";
import { useTabStore } from "@/stores/useTabStore";
import { useEditorStore } from "@/stores/useEditorStore";
import { useSettingsStore } from "@/stores/useSettingsStore";

function isEditorFocused(): boolean {
  const el = document.activeElement;
  if (!el) return false;
  return Boolean(el.closest(".monaco-editor"));
}

function confirmClose(tabName: string): boolean {
  const { confirmCloseTab } = useSettingsStore.getState().settings;
  if (!confirmCloseTab) return true;
  return window.confirm(`Close "${tabName}"?`);
}

export function useKeyboardShortcuts(
  onOpenHistory?: () => void,
  onOpenSettings?: () => void,
  onOpenPalette?: () => void,
  onFocusGlobalSearch?: () => void,
  onOpenTerminalSearch?: () => void,
  onToggleExplorer?: () => void,
) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const {
        tabs,
        activeTabId,
        addTab,
        removeTab,
        reopenLastClosedTab,
        setActiveTab,
        setRenamingTabId,
        splitPane,
        closePane,
        focusAdjacentPane,
      } = useTabStore.getState();

      const mod = e.ctrlKey || e.metaKey;
      const terminalFocused = isTerminalFocused();

      if (e.key === "F2" && activeTabId) {
        e.preventDefault();
        setRenamingTabId(activeTabId);
        return;
      }

      if (mod && e.key === ",") {
        e.preventDefault();
        onOpenSettings?.();
        return;
      }

      if (mod && e.shiftKey && (e.key === "P" || e.key === "p")) {
        e.preventDefault();
        onOpenPalette?.();
        return;
      }

      if (mod && e.key === "k" && !e.shiftKey) {
        if (terminalFocused) return;
        e.preventDefault();
        onOpenPalette?.();
        return;
      }

      if (mod && e.key === "f" && !e.shiftKey) {
        if (terminalFocused) return;
        e.preventDefault();
        onFocusGlobalSearch?.();
        return;
      }

      if (mod && e.shiftKey && (e.key === "F" || e.key === "f")) {
        e.preventDefault();
        onOpenTerminalSearch?.();
        return;
      }

      if (mod && e.key === "t" && !e.shiftKey) {
        if (terminalFocused) return;
        e.preventDefault();
        addTab();
        return;
      }

      if (mod && e.shiftKey && e.key === "T") {
        e.preventDefault();
        reopenLastClosedTab();
        return;
      }

      if (mod && e.key === "s" && !e.shiftKey) {
        if (!isEditorFocused() || !activeTabId) return;
        e.preventDefault();
        void useEditorStore.getState().saveActiveFile(activeTabId);
        return;
      }

      if (mod && e.shiftKey && (e.key === "E" || e.key === "e")) {
        e.preventDefault();
        const { explorerOpen } = useSettingsStore.getState().settings;
        useSettingsStore.getState().updateSettings({ explorerOpen: !explorerOpen });
        if (!explorerOpen) onToggleExplorer?.();
        return;
      }

      if (mod && e.key === "w") {
        if (isEditorFocused() && activeTabId) {
          e.preventDefault();
          const editor = useEditorStore.getState().byTabId[activeTabId];
          const activeFileId = editor?.activeFileId;
          if (activeFileId) {
            const file = editor.files.find((f) => f.id === activeFileId);
            if (file?.dirty && !window.confirm(`Discard unsaved changes to ${file.path.split("/").pop()}?`)) {
              return;
            }
            useEditorStore.getState().closeFile(activeTabId, activeFileId, true);
          }
          return;
        }
        if (terminalFocused) return;
        e.preventDefault();
        if (!activeTabId) return;
        const tab = tabs.find((t) => t.id === activeTabId);
        if (!tab) return;
        const paneCount = Object.keys(tab.panes).length;
        if (paneCount > 1) {
          closePane(tab.id, getFocusedPane(tab).id);
        } else if (confirmClose(tab.name)) {
          removeTab(activeTabId);
        }
        return;
      }

      if (mod && e.key === "\\" && !e.shiftKey) {
        if (terminalFocused) return;
        e.preventDefault();
        if (activeTabId) splitPane(activeTabId, "horizontal");
        return;
      }

      if (mod && e.shiftKey && e.key === "\\") {
        if (terminalFocused) return;
        e.preventDefault();
        if (activeTabId) splitPane(activeTabId, "vertical");
        return;
      }

      if (mod && e.key === "Tab") {
        if (terminalFocused) return;
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

      if (mod && e.altKey && (e.key === "ArrowRight" || e.key === "ArrowDown")) {
        e.preventDefault();
        if (activeTabId) focusAdjacentPane(activeTabId, "next");
        return;
      }

      if (mod && e.altKey && (e.key === "ArrowLeft" || e.key === "ArrowUp")) {
        e.preventDefault();
        if (activeTabId) focusAdjacentPane(activeTabId, "prev");
        return;
      }

      if (mod && e.key >= "1" && e.key <= "9") {
        if (terminalFocused) return;
        const index = parseInt(e.key, 10) - 1;
        if (tabs[index]) {
          e.preventDefault();
          setActiveTab(tabs[index].id);
        }
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [
    onOpenHistory,
    onOpenSettings,
    onOpenPalette,
    onFocusGlobalSearch,
    onOpenTerminalSearch,
    onToggleExplorer,
  ]);
}
