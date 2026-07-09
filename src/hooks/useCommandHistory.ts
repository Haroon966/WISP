import { useCallback, useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import { useTabStore } from "@/stores/useTabStore";

const EMPTY_HISTORY: string[] = [];

export function useCommandHistory(tabId: string | undefined, paneId: string | undefined) {
  const pane = useTabStore(
    useShallow((s) => {
      if (!tabId || !paneId) return null;
      return s.tabs.find((t) => t.id === tabId)?.panes[paneId] ?? null;
    }),
  );
  const appendCommand = useTabStore((s) => s.appendCommand);

  const history = useMemo(() => {
    if (!pane) return EMPTY_HISTORY;
    return [...pane.commandRuns.map((r) => r.command), ...pane.commandHistory].filter(
      (cmd, i, arr) => arr.indexOf(cmd) === i,
    );
  }, [pane]);

  const recordCommand = useCallback(
    (command: string) => {
      if (tabId && paneId) appendCommand(tabId, paneId, command);
    },
    [tabId, paneId, appendCommand],
  );

  return { history, recordCommand };
}
