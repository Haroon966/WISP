import { memo, useCallback, useEffect, useState } from "react";
import { ChevronRightIcon } from "lucide-react";
import { listDirectory, type DirEntry } from "@/lib/fs";
import {
  materialFileIconUrl,
  materialFolderIconUrl,
} from "@/lib/materialIcons";
import { tauriReady, waitForTauri } from "@/lib/tauriWindow";
import { mediaKindFromPath } from "@/lib/media";
import { prefetchMediaPreview } from "@/lib/mediaCache";
import { useEditorStore } from "@/stores/useEditorStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { cn } from "@/lib/utils";

function TreeIcon({ src }: { src: string }) {
  return (
    <img
      src={src}
      alt=""
      draggable={false}
      className="size-4 shrink-0"
    />
  );
}

interface FileTreeItemProps {
  tabId: string;
  entry: DirEntry;
  depth: number;
  expandedPaths: string[];
  selectedPath: string | null;
  onToggle: (path: string) => void;
  onOpenFile: (path: string, preview: boolean) => void;
  dirVersion: number;
}

const FileTreeItem = memo(function FileTreeItem({
  tabId,
  entry,
  depth,
  expandedPaths,
  selectedPath,
  onToggle,
  onOpenFile,
  dirVersion,
}: FileTreeItemProps) {
  const includeHidden = useSettingsStore((s) => s.settings.explorerShowHidden);
  const [children, setChildren] = useState<DirEntry[]>([]);
  const expanded = expandedPaths.includes(entry.path);
  const isDir = entry.kind === "dir";

  useEffect(() => {
    if (!isDir || !expanded) return;
    let cancelled = false;
    void listDirectory(entry.path, includeHidden).then((entries) => {
      if (!cancelled) setChildren(entries);
    });
    return () => {
      cancelled = true;
    };
  }, [entry.path, expanded, includeHidden, isDir, dirVersion]);

  const onClick = () => {
    if (isDir) {
      onToggle(entry.path);
      return;
    }
    onOpenFile(entry.path, true);
  };

  const onPointerEnter = () => {
    if (!isDir && mediaKindFromPath(entry.path)) {
      prefetchMediaPreview(entry.path);
    }
  };

  const onDoubleClick = () => {
    if (!isDir) onOpenFile(entry.path, false);
  };

  return (
    <div>
      <button
        type="button"
        className={cn(
          "flex h-7 w-full min-w-0 cursor-pointer items-center gap-1 pr-2 text-left text-sm hover:bg-muted/50",
          selectedPath === entry.path && "bg-primary/10 text-foreground",
        )}
        style={{
          paddingLeft: `${depth * 12 + 8}px`,
          contentVisibility: "auto",
          containIntrinsicSize: "0 28px",
        }}
        onClick={onClick}
        onDoubleClick={onDoubleClick}
        onPointerEnter={onPointerEnter}
      >
        {isDir ? (
          <ChevronRightIcon
            className={cn(
              "size-3.5 shrink-0 text-muted-foreground transition-transform",
              expanded && "rotate-90",
            )}
          />
        ) : (
          <span className="size-3.5 shrink-0" />
        )}
        <TreeIcon
          src={
            isDir
              ? materialFolderIconUrl(entry.name, expanded)
              : materialFileIconUrl(entry.name)
          }
        />
        <span className="truncate">{entry.name}</span>
      </button>
      {isDir && expanded
        ? children.map((child) => (
            <FileTreeDirItem
              key={child.path}
              tabId={tabId}
              entry={child}
              depth={depth + 1}
              expandedPaths={expandedPaths}
              selectedPath={selectedPath}
              onToggle={onToggle}
              onOpenFile={onOpenFile}
            />
          ))
        : null}
    </div>
  );
});

function FileTreeDirItem(
  props: Omit<FileTreeItemProps, "dirVersion">,
) {
  const dirVersion = useEditorStore(
    (s) => s.byTabId[props.tabId]?.dirVersions?.[props.entry.path] ?? 0,
  );
  return <FileTreeItem {...props} dirVersion={dirVersion} />;
}

interface FileTreeProps {
  tabId: string;
  rootPath: string;
}

const EMPTY_EXPANDED_PATHS: readonly string[] = [];

export function FileTree({ tabId, rootPath }: FileTreeProps) {
  const includeHidden = useSettingsStore((s) => s.settings.explorerShowHidden);
  const expandedPaths = useEditorStore(
    (s) => s.byTabId[tabId]?.expandedPaths ?? EMPTY_EXPANDED_PATHS,
  );
  const rootDirVersion = useEditorStore(
    (s) =>
      s.byTabId[tabId]?.dirVersions?.[rootPath] ??
      s.byTabId[tabId]?.treeVersion ??
      0,
  );
  const selectedPath = useEditorStore((s) => {
    const st = s.byTabId[tabId];
    if (!st?.activeFileId) return null;
    return st.files.find((f) => f.id === st.activeFileId)?.path ?? null;
  });
  const toggleExpanded = useEditorStore((s) => s.toggleExpanded);
  const openFile = useEditorStore((s) => s.openFile);

  const [rootEntries, setRootEntries] = useState<DirEntry[]>([]);

  const refresh = useCallback(() => {
    void listDirectory(rootPath, includeHidden).then(setRootEntries);
  }, [rootPath, includeHidden]);

  useEffect(() => {
    let cancelled = false;
    const run = () => {
      if (!cancelled) refresh();
    };
    if (tauriReady()) run();
    else void waitForTauri().then(run);
    return () => {
      cancelled = true;
    };
  }, [refresh, rootDirVersion]);

  const onToggle = (path: string) => toggleExpanded(tabId, path);
  const onOpenFile = (path: string, preview: boolean) => {
    void openFile(tabId, path, { preview, pin: !preview });
  };

  return (
    <div className="py-1">
      {rootEntries.map((entry) => (
        <FileTreeDirItem
          key={entry.path}
          tabId={tabId}
          entry={entry}
          depth={0}
          expandedPaths={expandedPaths}
          selectedPath={selectedPath}
          onToggle={onToggle}
          onOpenFile={onOpenFile}
        />
      ))}
    </div>
  );
}
