import type { LayoutNode, SplitDirection } from "@/types/layout";
import type { PaneState } from "@/types/tab";

import type { ShellKind } from "@/types/profile";

export function createPane(
  cwd?: string,
  opts?: {
    initialCommand?: string;
    sshHost?: string;
    shell?: ShellKind;
    env?: Record<string, string>;
  },
): PaneState {
  return {
    id: crypto.randomUUID(),
    status: "neutral",
    cwd,
    commandHistory: [],
    commandRuns: [],
    initialCommand: opts?.initialCommand,
    sshHost: opts?.sshHost,
    shell: opts?.shell,
    env: opts?.env,
  };
}

export function singlePaneLayout(paneId: string): LayoutNode {
  return { type: "pane", paneId };
}

export function getFocusedPane(tab: {
  panes: Record<string, PaneState>;
  focusedPaneId: string;
}): PaneState {
  const pane = tab.panes[tab.focusedPaneId];
  if (pane) return pane;
  const first = Object.values(tab.panes)[0];
  if (first) return first;
  return createPane("~");
}

export function splitLayout(
  layout: LayoutNode,
  paneId: string,
  direction: SplitDirection,
  newPaneId: string,
): LayoutNode {
  if (layout.type === "pane") {
    if (layout.paneId !== paneId) return layout;
    return {
      type: "split",
      direction,
      children: [
        { type: "pane", paneId },
        { type: "pane", paneId: newPaneId },
      ],
      sizes: [1, 1],
    };
  }

  return {
    ...layout,
    children: layout.children.map((child) =>
      splitLayout(child, paneId, direction, newPaneId),
    ),
  };
}

export function removePaneFromLayout(
  layout: LayoutNode,
  paneId: string,
): LayoutNode | null {
  if (layout.type === "pane") {
    return layout.paneId === paneId ? null : layout;
  }

  const children = layout.children
    .map((child) => removePaneFromLayout(child, paneId))
    .filter((c): c is LayoutNode => c !== null);

  if (children.length === 0) return null;
  if (children.length === 1) return children[0];

  const sizes = layout.sizes.slice(0, children.length);
  while (sizes.length < children.length) sizes.push(1);

  return { ...layout, children, sizes };
}

export function collectPaneIds(layout: LayoutNode): string[] {
  if (layout.type === "pane") return [layout.paneId];
  return layout.children.flatMap(collectPaneIds);
}

export function updateSplitSizes(
  layout: LayoutNode,
  path: number[],
  sizes: number[],
): LayoutNode {
  if (layout.type === "pane" || path.length === 0) {
    if (layout.type === "split") return { ...layout, sizes };
    return layout;
  }

  const [idx, ...rest] = path;
  if (layout.type !== "split") return layout;

  return {
    ...layout,
    children: layout.children.map((child, i) =>
      i === idx ? updateSplitSizes(child, rest, sizes) : child,
    ),
  };
}

export function findSplitPath(
  layout: LayoutNode,
  paneId: string,
  path: number[] = [],
): number[] | null {
  if (layout.type === "pane") return null;

  for (let i = 0; i < layout.children.length; i++) {
    const child = layout.children[i];
    if (child.type === "pane" && child.paneId === paneId) return path;
    const found = findSplitPath(child, paneId, [...path, i]);
    if (found) return found;
  }
  return null;
}

export function focusAdjacentPane(
  layout: LayoutNode,
  focusedPaneId: string,
  direction: "next" | "prev",
): string | null {
  const paneIds = collectPaneIds(layout);
  const index = paneIds.indexOf(focusedPaneId);
  if (index === -1 || paneIds.length <= 1) return null;
  const nextIndex =
    direction === "next"
      ? (index + 1) % paneIds.length
      : (index - 1 + paneIds.length) % paneIds.length;
  return paneIds[nextIndex];
}
