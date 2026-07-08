import { useState } from "react";
import { PlusIcon, SearchIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TabList } from "@/components/sidebar/TabList";
import { useTabStore } from "@/stores/useTabStore";

export function Sidebar() {
  const addTab = useTabStore((s) => s.addTab);
  const [query, setQuery] = useState("");

  return (
    <aside className="flex h-full w-72 shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
      <div className="flex items-center gap-2 p-3">
        <div className="relative min-w-0 flex-1">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-sidebar-muted" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search sessions..."
            className="h-9 rounded-full border-0 bg-sidebar-accent pl-9 text-sm shadow-none placeholder:text-sidebar-muted focus-visible:ring-1 focus-visible:ring-sidebar-ring"
          />
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="size-9 shrink-0 rounded-full text-sidebar-foreground"
          onClick={() => addTab()}
          aria-label="New session"
        >
          <PlusIcon />
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto px-2 pb-3">
        <TabList query={query} />
      </div>
    </aside>
  );
}
