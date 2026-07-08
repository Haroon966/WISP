import { AppShell } from "@/components/layout/AppShell";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useState } from "react";

function App() {
  const [historyOpen, setHistoryOpen] = useState(false);
  useKeyboardShortcuts(() => setHistoryOpen(true));

  return (
    <TooltipProvider>
      <AppShell historyOpen={historyOpen} onHistoryOpenChange={setHistoryOpen} />
    </TooltipProvider>
  );
}

export default App;
