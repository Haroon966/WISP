import type { LayoutNode } from "@/types/layout";
import type { PaneState } from "@/types/tab";
import { createPane } from "@/lib/layout";

export type LayoutPresetId = "fullstack" | "review" | "deploy";

export const LAYOUT_PRESETS: Record<
  LayoutPresetId,
  { label: string; description: string; paneCount: number }
> = {
  fullstack: {
    label: "Fullstack",
    description: "Server · client · logs",
    paneCount: 3,
  },
  review: {
    label: "Review",
    description: "Diff · tests",
    paneCount: 2,
  },
  deploy: {
    label: "Deploy",
    description: "Build · deploy",
    paneCount: 2,
  },
};

function threePaneHorizontal(ids: [string, string, string]): LayoutNode {
  return {
    type: "split",
    direction: "horizontal",
    sizes: [1, 1, 1],
    children: [
      { type: "pane", paneId: ids[0] },
      { type: "pane", paneId: ids[1] },
      { type: "pane", paneId: ids[2] },
    ],
  };
}

function twoPaneSplit(
  ids: [string, string],
  direction: "horizontal" | "vertical",
): LayoutNode {
  return {
    type: "split",
    direction,
    sizes: [1, 1],
    children: [
      { type: "pane", paneId: ids[0] },
      { type: "pane", paneId: ids[1] },
    ],
  };
}

export function buildLayoutPreset(
  preset: LayoutPresetId,
  cwd: string,
): { layout: LayoutNode; panes: Record<string, PaneState>; focusedPaneId: string } {
  const paneA = createPane(cwd);
  const paneB = createPane(cwd);
  const paneC = createPane(cwd);

  switch (preset) {
    case "fullstack":
      return {
        layout: threePaneHorizontal([paneA.id, paneB.id, paneC.id]),
        panes: { [paneA.id]: paneA, [paneB.id]: paneB, [paneC.id]: paneC },
        focusedPaneId: paneA.id,
      };
    case "review":
      return {
        layout: twoPaneSplit([paneA.id, paneB.id], "vertical"),
        panes: { [paneA.id]: paneA, [paneB.id]: paneB },
        focusedPaneId: paneA.id,
      };
    case "deploy":
      return {
        layout: twoPaneSplit([paneA.id, paneB.id], "horizontal"),
        panes: { [paneA.id]: paneA, [paneB.id]: paneB },
        focusedPaneId: paneA.id,
      };
  }
}
