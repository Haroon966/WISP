import type { LayoutNode } from "@/types/layout";
import type { Tab } from "@/types/tab";
import { TerminalView, type TerminalHandlers } from "@/components/terminal/TerminalView";
import { ResizeHandle } from "@/components/layout/ResizeHandle";
import { useTabStore } from "@/stores/useTabStore";
import { cn } from "@/lib/utils";

interface SplitLayoutProps {
  tab: Tab;
  active: boolean;
  onTerminalReady?: (key: string, handlers: TerminalHandlers) => void;
}

interface LayoutNodeViewProps extends SplitLayoutProps {
  node: LayoutNode;
  path: number[];
}

function SplitHandle({
  direction,
  onDrag,
}: {
  direction: "horizontal" | "vertical";
  onDrag: (delta: number) => void;
}) {
  return <ResizeHandle direction={direction} onDrag={onDrag} />;
}

function LayoutNodeView({ node, path, tab, active, onTerminalReady }: LayoutNodeViewProps) {
  const resizeSplit = useTabStore((s) => s.resizeSplit);

  if (node.type === "pane") {
    return (
      <TerminalView
        tabId={tab.id}
        paneId={node.paneId}
        focused={tab.focusedPaneId === node.paneId}
        active={active}
        onReady={onTerminalReady}
      />
    );
  }

  const isRow = node.direction === "horizontal";

  const handleDrag = (index: number, delta: number) => {
    const sizes = [...node.sizes];
    const total = sizes.reduce((a, b) => a + b, 0);
    const flexDelta = (delta / 300) * total;
    sizes[index] = Math.max(0.15, sizes[index] + flexDelta);
    sizes[index + 1] = Math.max(0.15, sizes[index + 1] - flexDelta);
    resizeSplit(tab.id, path, sizes);
  };

  const elements: React.ReactNode[] = [];
  node.children.forEach((child, i) => {
    elements.push(
      <div
        key={`child-${i}`}
        className="flex min-h-0 min-w-0"
        style={{ flex: node.sizes[i] ?? 1 }}
      >
        <LayoutNodeView
          node={child}
          path={[...path, i]}
          tab={tab}
          active={active}
          onTerminalReady={onTerminalReady}
        />
      </div>,
    );
    if (i < node.children.length - 1) {
      elements.push(
        <SplitHandle
          key={`handle-${i}`}
          direction={node.direction}
          onDrag={(delta) => handleDrag(i, delta)}
        />,
      );
    }
  });

  return (
    <div
      className={cn(
        "flex min-h-0 min-w-0 flex-1",
        isRow ? "flex-row" : "flex-col",
      )}
    >
      {elements}
    </div>
  );
}

export function SplitLayout({ tab, active, onTerminalReady }: SplitLayoutProps) {
  return (
    <LayoutNodeView
      node={tab.layout}
      path={[]}
      tab={tab}
      active={active}
      onTerminalReady={onTerminalReady}
    />
  );
}
