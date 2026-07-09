export type SplitDirection = "horizontal" | "vertical";

export type LayoutNode =
  | { type: "pane"; paneId: string }
  | {
      type: "split";
      direction: SplitDirection;
      children: LayoutNode[];
      sizes: number[];
    };
