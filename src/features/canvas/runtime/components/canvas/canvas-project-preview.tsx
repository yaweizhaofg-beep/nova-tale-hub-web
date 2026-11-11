import { Workflow } from "canvas-lucide";

import { nodeBounds } from "@canvas/lib/canvas/canvas-node-geometry";
import { canvasNodeColor } from "@canvas/lib/canvas-theme";
import { CanvasNodeType, type CanvasConnection, type CanvasNodeData } from "@canvas/types/canvas";

const previewWidth = 320;
const previewHeight = 144;
const inset = 20;
const maxNodes = 36;
const maxConnections = 48;
const defaultAccent = "#ff8a1f";

export function CanvasProjectPreview({ nodes, connections }: { nodes: CanvasNodeData[]; connections: CanvasConnection[] }) {
    const previewNodes = nodes.slice(0, maxNodes).filter(({ position, width, height }) =>
        [position?.x, position?.y, width, height].every(Number.isFinite) && width > 0 && height > 0);
    const featured = previewNodes.find((node) => node.type !== CanvasNodeType.Group);
    const accent = featured ? canvasNodeColor(featured.type, defaultAccent) : defaultAccent;
    const { left, top, right, bottom } = previewNodes.length
        ? nodeBounds(previewNodes)
        : { left: 0, top: 0, right: 1, bottom: 1 };
    const scale = Math.min((previewWidth - inset * 2) / (right - left), (previewHeight - inset * 2) / (bottom - top), 0.75);
    const startX = (previewWidth - (right - left) * scale) / 2;
    const startY = (previewHeight - (bottom - top) * scale) / 2;
    const boxes = previewNodes.map((node) => ({
        id: node.id, group: node.type === CanvasNodeType.Group, color: canvasNodeColor(node.type, accent),
        x: startX + (node.position.x - left) * scale,
        y: startY + (node.position.y - top) * scale,
        width: Math.max(4, node.width * scale),
        height: Math.max(3, node.height * scale),
    }));
    const byId = new Map(boxes.map((box) => [box.id, box]));

    return (
        <div aria-hidden className="relative grid aspect-[2.25] place-items-center overflow-hidden border-b border-border bg-background"
            style={{
                backgroundImage: `radial-gradient(ellipse at 74% 0%, ${accent}30, transparent 74%), radial-gradient(circle, var(--border) 1px, transparent 1px)`,
                backgroundSize: "auto, 12px 12px",
            }}>
            {boxes.length ? (
                <svg focusable="false" viewBox={`0 0 ${previewWidth} ${previewHeight}`} className="size-full">
                    {boxes.filter((box) => box.group).map((box) => (
                        <rect key={box.id} x={box.x} y={box.y} width={box.width} height={box.height} rx="5"
                            fill={`${box.color}14`} stroke={`${box.color}70`} strokeDasharray="3 3" />
                    ))}
                    {connections.slice(0, maxConnections).map((connection) => {
                        const from = byId.get(connection.fromNodeId);
                        const to = byId.get(connection.toNodeId);
                        if (!from || !to) return null;
                        const x1 = from.x + from.width;
                        const y1 = from.y + from.height / 2;
                        const y2 = to.y + to.height / 2;
                        const bend = Math.max(8, Math.abs(to.x - x1) / 2);
                        return <path key={connection.id} d={`M ${x1} ${y1} C ${x1 + bend} ${y1}, ${to.x - bend} ${y2}, ${to.x} ${y2}`}
                            fill="none" stroke={`${from.color}90`} strokeWidth="1.25" />;
                    })}
                    {boxes.filter((box) => !box.group).map((box) => (
                        <rect key={box.id} x={box.x} y={box.y} width={box.width} height={box.height} rx="3"
                            fill={`${box.color}34`} stroke={`${box.color}aa`} />
                    ))}
                </svg>
            ) : (
                <span className="flex flex-col items-center gap-2 text-xs text-muted-foreground">
                    <span className="grid size-10 place-items-center rounded-xl border border-amber-600/25 bg-amber-600/10 text-amber-800 dark:text-[color:var(--canvas-accent)]">
                        <Workflow className="size-5" />
                    </span>
                    空白画布
                </span>
            )}
        </div>
    );
}
