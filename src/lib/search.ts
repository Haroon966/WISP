import Fuse from "fuse.js";

export const FUSE_OPTIONS = {
  threshold: 0.45,
  ignoreLocation: true,
  minMatchCharLength: 1,
} as const;

export function createFuse<T>(items: readonly T[], keys: string[]) {
  return new Fuse([...items], { ...FUSE_OPTIONS, keys });
}

export function searchWithFuse<T>(fuse: Fuse<T>, query: string): T[] {
  const q = query.trim();
  if (!q) return fuse.getIndex().docs as T[];
  return fuse.search(q).map((r) => r.item);
}

export function fuseFilter<T>(
  items: readonly T[],
  keys: string[],
  query: string,
): T[] {
  return searchWithFuse(createFuse(items, keys), query);
}

/** cmdk filter: 0 hides item, higher ranks better matches */
export function buildCmdkFuseScores(
  fuse: Fuse<{ value: string }>,
  search: string,
): Map<string, number> {
  const scores = new Map<string, number>();
  const q = search.trim();
  if (!q) return scores;
  for (const hit of fuse.search(q)) {
    scores.set(hit.item.value, Math.max(0.01, 1 - (hit.score ?? 0)));
  }
  return scores;
}

/** Runs fuse.search once per distinct search string (cmdk calls filter per item). */
export function createCmdkFuseFilter(fuse: Fuse<{ value: string }>) {
  let lastSearch = "";
  let lastScores = new Map<string, number>();

  return (value: string, search: string): number => {
    if (!search.trim()) return 1;
    if (search !== lastSearch) {
      lastSearch = search;
      lastScores = buildCmdkFuseScores(fuse, search);
    }
    return lastScores.get(value) ?? 0;
  };
}
