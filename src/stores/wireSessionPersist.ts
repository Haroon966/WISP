import { scheduleSessionPersist } from "@/lib/sessionPersist";
import { useEditorStore } from "@/stores/useEditorStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { useTabStore } from "@/stores/useTabStore";

function snapshotSession() {
  const tabState = useTabStore.getState();
  return {
    tabs: tabState.tabs,
    activeTabId: tabState.activeTabId,
    closedTabs: tabState.closedTabs,
    editorByTabId: useEditorStore.getState().getPersistedState(),
  };
}

export function wireSessionPersist() {
  const persist = () => {
    scheduleSessionPersist(
      snapshotSession,
      () => useSettingsStore.getState().settings.restoreSessionOnLaunch,
    );
  };
  useTabStore.subscribe(persist);
  useEditorStore.subscribe(persist);
}
