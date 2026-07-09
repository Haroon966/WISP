import { useEffect, useMemo, useState } from "react";
import { findRepoRoot } from "@/lib/fs";
import { getFocusedPane } from "@/lib/layout";
import type { Tab } from "@/types/tab";

const TTL_MS = 60_000;
const cache = new Map<string, { root: string | null; at: number }>();

export async function findRepoRootCached(cwd: string): Promise<string | null> {
  const hit = cache.get(cwd);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.root;
  try {
    const root = await findRepoRoot(cwd);
    cache.set(cwd, { root, at: Date.now() });
    return root;
  } catch {
    cache.set(cwd, { root: null, at: Date.now() });
    return null;
  }
}

export function useRepoRoots(tabs: Tab[]) {
  const [repoRoots, setRepoRoots] = useState<Record<string, string>>({});
  const cwdKey = useMemo(
    () =>
      tabs
        .map((t) => `${t.id}:${getFocusedPane(t).cwd ?? "~"}`)
        .join("|"),
    [tabs],
  );

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const next: Record<string, string> = {};
      await Promise.all(
        tabs.map(async (tab) => {
          const cwd = getFocusedPane(tab).cwd ?? "~";
          const root = await findRepoRootCached(cwd);
          if (root) next[tab.id] = root;
        }),
      );
      if (!cancelled) setRepoRoots(next);
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [cwdKey, tabs]);

  return repoRoots;
}
