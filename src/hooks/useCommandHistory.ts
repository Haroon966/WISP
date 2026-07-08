import { useCallback } from "react";
import { useTabStore } from "@/stores/useTabStore";

export function useCommandHistory(tabId: string | undefined) {
  const tab = useTabStore((s) => s.tabs.find((t) => t.id === tabId));
  const appendCommand = useTabStore((s) => s.appendCommand);

  const history = tab?.commandHistory ?? [];

  const recordCommand = useCallback(
    (command: string) => {
      if (tabId) appendCommand(tabId, command);
    },
    [tabId, appendCommand],
  );

  return { history, recordCommand };
}
