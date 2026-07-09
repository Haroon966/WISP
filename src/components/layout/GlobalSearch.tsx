import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import {
  FolderIcon,
  FolderOpenIcon,
  SearchIcon,
  TerminalIcon,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useFuseGlobalSearch } from "@/hooks/useGlobalSearchItems";
import type { GlobalSearchItem, GlobalSearchKind } from "@/hooks/useGlobalSearchItems";
import { getFocusedPane } from "@/lib/layout";
import { useTabStore } from "@/stores/useTabStore";
import { cn } from "@/lib/utils";

export interface GlobalSearchHandle {
  focus: () => void;
}

interface GlobalSearchProps {
  query: string;
  onQueryChange: (query: string) => void;
  onNavigate?: () => void;
  className?: string;
}

const kindLabel: Record<GlobalSearchKind, string> = {
  session: "Sessions",
  project: "Projects",
  place: "Places",
  folder: "Folders",
};

const kindIcon: Record<GlobalSearchKind, typeof TerminalIcon> = {
  session: TerminalIcon,
  project: FolderOpenIcon,
  place: FolderIcon,
  folder: FolderIcon,
};

function groupResults(items: GlobalSearchItem[]) {
  const groups = new Map<GlobalSearchKind, GlobalSearchItem[]>();
  for (const item of items) {
    const list = groups.get(item.kind) ?? [];
    list.push(item);
    groups.set(item.kind, list);
  }
  return groups;
}

export const GlobalSearch = forwardRef<GlobalSearchHandle, GlobalSearchProps>(
  function GlobalSearch({ query, onQueryChange, onNavigate, className }, ref) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [open, setOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);
    const results = useFuseGlobalSearch(query);
    const setActiveTab = useTabStore((s) => s.setActiveTab);
    const addTab = useTabStore((s) => s.addTab);
    const tabs = useTabStore((s) => s.tabs);

    useImperativeHandle(ref, () => ({
      focus: () => {
        inputRef.current?.focus();
        setOpen(true);
      },
    }));

    useEffect(() => {
      setActiveIndex(0);
    }, [query, results.length]);

    const runItem = (item: GlobalSearchItem) => {
      if (item.kind === "session" && item.tabId) {
        setActiveTab(item.tabId);
      } else if (item.kind === "project" && item.path) {
        const existing = tabs.find((tab) => {
          const cwd = getFocusedPane(tab).cwd ?? "~";
          return cwd === item.path || cwd.startsWith(`${item.path}/`);
        });
        if (existing) setActiveTab(existing.id);
        else addTab(item.label, item.path);
      } else if (item.path) {
        addTab(item.label, item.path);
      }
      onQueryChange("");
      setOpen(false);
      onNavigate?.();
    };

    const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setOpen(true);
        setActiveIndex((i) => Math.min(i + 1, Math.max(0, results.length - 1)));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === "Enter" && results[activeIndex]) {
        e.preventDefault();
        runItem(results[activeIndex]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        onQueryChange("");
        setOpen(false);
        inputRef.current?.blur();
      }
    };

    const grouped = groupResults(results.slice(0, 20));
    let row = 0;

    return (
      <div className={cn("relative w-full", className)}>
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              onQueryChange(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => window.setTimeout(() => setOpen(false), 150)}
            onKeyDown={onKeyDown}
            placeholder="Search projects, sessions, folders..."
            className="h-9 cursor-text rounded-full border-border/70 bg-muted/40 pl-9 text-sm shadow-none transition-colors duration-200 placeholder:text-muted-foreground focus-visible:bg-background focus-visible:ring-1 focus-visible:ring-ring"
            aria-label="Global search"
            aria-expanded={open && query.trim().length > 0}
            aria-controls="global-search-results"
            role="combobox"
            autoComplete="off"
          />
        </div>

        {open && query.trim() ? (
          <div
            id="global-search-results"
            role="listbox"
            className="absolute top-[calc(100%+0.35rem)] z-50 max-h-80 w-full overflow-y-auto rounded-xl border border-border/80 bg-popover p-1 shadow-lg"
          >
            {results.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                No results found.
              </p>
            ) : (
              Array.from(grouped.entries()).map(([kind, items]) => (
                <div key={kind} className="py-1">
                  <p className="px-2.5 py-1 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                    {kindLabel[kind]}
                  </p>
                  {items.map((item) => {
                    const Icon = kindIcon[item.kind];
                    const index = row++;
                    const selected = index === activeIndex;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        role="option"
                        aria-selected={selected}
                        className={cn(
                          "flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors duration-200",
                          selected
                            ? "bg-accent text-accent-foreground"
                            : "hover:bg-muted/60",
                        )}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => runItem(item)}
                      >
                        <Icon className="size-4 shrink-0 opacity-70" />
                        <span className="min-w-0 flex-1 truncate font-medium">
                          {item.label}
                        </span>
                        {item.detail ? (
                          <span className="max-w-[45%] truncate text-xs text-muted-foreground">
                            {item.detail}
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        ) : null}
      </div>
    );
  },
);
