import { useMemo } from "react";
import { PLACE_FOLDERS } from "@/lib/folders";
import { projectNameFromRoot } from "@/lib/fs";
import { loadRecentDirs } from "@/lib/recentDirs";
import { createFuse, searchWithFuse } from "@/lib/search";
import { useRepoRoots } from "@/lib/repoRootCache";
import { getTabDisplayMeta, useTabStore } from "@/stores/useTabStore";
import type { Tab } from "@/types/tab";

export type GlobalSearchKind = "session" | "project" | "place" | "folder";

export interface GlobalSearchItem {
  id: string;
  kind: GlobalSearchKind;
  label: string;
  detail?: string;
  tokens: string;
  tabId?: string;
  path?: string;
}

export function buildGlobalSearchItems(
  tabs: Tab[],
  repoRoots: Record<string, string>,
  recentDirs: string[],
): GlobalSearchItem[] {
  const items: GlobalSearchItem[] = [];

  for (const tab of tabs) {
    const { cwd, branch } = getTabDisplayMeta(tab);
    items.push({
      id: `session:${tab.id}`,
      kind: "session",
      label: tab.name,
      detail: [cwd ?? "~", branch].filter(Boolean).join(" · "),
      tokens: [tab.name, cwd ?? "~", branch ?? ""].join(" "),
      tabId: tab.id,
    });
  }

  const seenProjects = new Set<string>();
  for (const root of Object.values(repoRoots)) {
    if (seenProjects.has(root)) continue;
    seenProjects.add(root);
    const name = projectNameFromRoot(root);
    items.push({
      id: `project:${root}`,
      kind: "project",
      label: name,
      detail: root,
      tokens: `${name} ${root}`,
      path: root,
    });
  }

  for (const place of PLACE_FOLDERS) {
    items.push({
      id: `place:${place.path}`,
      kind: "place",
      label: place.name,
      detail: place.path,
      tokens: `${place.name} ${place.path}`,
      path: place.path,
    });
  }

  for (const dir of recentDirs) {
    const name = dir.split("/").filter(Boolean).pop() ?? dir;
    items.push({
      id: `folder:${dir}`,
      kind: "folder",
      label: name,
      detail: dir,
      tokens: `${name} ${dir}`,
      path: dir,
    });
  }

  return items;
}

export function useGlobalSearchItems() {
  const tabs = useTabStore((s) => s.tabs);
  const repoRoots = useRepoRoots(tabs);
  const recentDirs = useMemo(() => loadRecentDirs(), []);

  return useMemo(
    () => buildGlobalSearchItems(tabs, repoRoots, recentDirs),
    [tabs, repoRoots, recentDirs],
  );
}

export function useFuseGlobalSearch(query: string) {
  const items = useGlobalSearchItems();
  const fuse = useMemo(
    () => createFuse(items, ["label", "detail", "tokens"]),
    [items],
  );
  return useMemo(() => searchWithFuse(fuse, query), [fuse, query]);
}

export function useFuseTabSearch(tabs: Tab[], query: string) {
  const searchable = useMemo(
    () =>
      tabs.map((tab) => {
        const { cwd, branch } = getTabDisplayMeta(tab);
        return {
          tab,
          tokens: [tab.name, cwd ?? "~", branch ?? ""].join(" "),
        };
      }),
    [tabs],
  );

  const fuse = useMemo(() => createFuse(searchable, ["tokens"]), [searchable]);

  return useMemo(() => {
    const hits = searchWithFuse(fuse, query);
    return hits.map((h) => h.tab);
  }, [fuse, query]);
}
