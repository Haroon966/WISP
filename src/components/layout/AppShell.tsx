import { Sidebar } from "@/components/layout/Sidebar";
import { MainPanel } from "@/components/layout/MainPanel";

interface AppShellProps {
  historyOpen?: boolean;
  onHistoryOpenChange?: (open: boolean) => void;
}

export function AppShell({ historyOpen, onHistoryOpenChange }: AppShellProps) {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      <Sidebar />
      <MainPanel
        historyOpen={historyOpen}
        onHistoryOpenChange={onHistoryOpenChange}
      />
    </div>
  );
}
