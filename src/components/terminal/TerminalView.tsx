import { useEffect, useRef } from "react";
import { useTerminal } from "@/hooks/useTerminal";
import { PowerlinePrompt } from "@/components/terminal/PowerlinePrompt";
import { BranchBadge } from "@/components/terminal/BranchBadge";

interface TerminalViewProps {
  tabId: string;
  onReady?: (
    tabId: string,
    handlers: {
      rerun: (command: string) => void;
      insert: (command: string) => void;
    },
  ) => void;
}

export function TerminalView({ tabId, onReady }: TerminalViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { rerunCommand, insertCommand } = useTerminal(tabId, containerRef);

  useEffect(() => {
    onReady?.(tabId, { rerun: rerunCommand, insert: insertCommand });
  }, [tabId, onReady, rerunCommand, insertCommand]);

  return (
    <div className="flex min-h-0 flex-1 flex-col px-2 pt-2 pb-2">
      <PowerlinePrompt tabId={tabId} className="mb-1 shrink-0" />
      <div className="relative min-h-0 flex-1">
        <div ref={containerRef} className="h-full w-full" />
        <BranchBadge tabId={tabId} />
      </div>
    </div>
  );
}
