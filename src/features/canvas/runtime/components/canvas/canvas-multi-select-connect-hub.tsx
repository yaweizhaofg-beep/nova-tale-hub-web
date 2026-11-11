import type { MouseEvent as ReactMouseEvent } from "react";
import { useMemo } from "react";
import { Link2 } from "canvas-lucide";

import { isHiddenBatchChild } from "@canvas/lib/canvas/canvas-node-geometry";
import { canvasThemes } from "@canvas/lib/canvas-theme";
import { useThemeStore } from "@canvas/stores/use-theme-store";
import { CanvasNodeType, type CanvasNodeData } from "@canvas/types/canvas";

const HUB_BLUE = "#2f80ff";

type Props = {
    nodes: CanvasNodeData[];
    selectedNodeIds: Set<string>;
    scale: number;
    onConnectStart: (event: ReactMouseEvent, nodeId: string, handleType: "source" | "target") => void;
};

/** 多选时在选区右侧显示醒目的批量出线连接点，拖出即代表整批选中素材 */
export function CanvasMultiSelectConnectHub({ nodes, selectedNodeIds, scale, onConnectStart }: Props) {
    const theme = canvasThemes[useThemeStore((state) => state.theme)];

    const selected = useMemo(
        () =>
            nodes.filter(
                (node) =>
                    selectedNodeIds.has(node.id) &&
                    node.type !== CanvasNodeType.Group &&
                    !isHiddenBatchChild(node, nodes),
            ),
        [nodes, selectedNodeIds],
    );

    const layout = useMemo(() => {
        if (selected.length < 2) return null;
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        for (const node of selected) {
            minX = Math.min(minX, node.position.x);
            minY = Math.min(minY, node.position.y);
            maxX = Math.max(maxX, node.position.x + node.width);
            maxY = Math.max(maxY, node.position.y + node.height);
        }
        const hubX = maxX + 56;
        const hubY = (minY + maxY) / 2;
        return { hubX, hubY, primaryId: selected[0].id, nodes: selected };
    }, [selected]);

    if (!layout) return null;

    const screenScale = 1 / Math.max(scale, 0.2);

    return (
        <div className="pointer-events-none absolute inset-0 z-[60]">
            <svg className="pointer-events-none absolute overflow-visible" style={{ left: 0, top: 0, width: 1, height: 1, overflow: "visible" }}>
                {layout.nodes.map((node) => {
                    const startX = node.position.x + node.width;
                    const startY = node.position.y + node.height / 2;
                    const midX = (startX + layout.hubX) / 2;
                    return (
                        <path
                            key={node.id}
                            d={`M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${layout.hubY}, ${layout.hubX} ${layout.hubY}`}
                            fill="none"
                            stroke={HUB_BLUE}
                            strokeWidth={2}
                            strokeOpacity={0.45}
                            strokeDasharray="6 5"
                        />
                    );
                })}
            </svg>

            <div
                data-canvas-connect-hub
                className="pointer-events-auto absolute"
                style={{
                    left: layout.hubX,
                    top: layout.hubY,
                    transform: `translate(-50%, -50%) scale(${screenScale})`,
                }}
                title={`批量连接（${layout.nodes.length} 个素材）`}
                onMouseDown={(event) => {
                    if (event.button !== 0) return;
                    // 不要 preventDefault：会抑制后续 mouseup，导致拖到空白处无法弹出新建菜单
                    event.stopPropagation();
                    onConnectStart(event, layout.primaryId, "source");
                }}
            >
                <div
                    className="group relative flex size-14 cursor-crosshair items-center justify-center rounded-full border-2 shadow-lg transition-transform hover:scale-110 active:scale-95"
                    style={{
                        background: theme.node.panel,
                        borderColor: HUB_BLUE,
                        boxShadow: `0 0 0 6px ${HUB_BLUE}33, 0 10px 28px rgba(0,0,0,.18)`,
                        color: HUB_BLUE,
                    }}
                >
                    <span
                        className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full px-1 text-[10px] font-semibold leading-5 text-white"
                        style={{ background: HUB_BLUE }}
                    >
                        {layout.nodes.length}
                    </span>
                    <Link2 className="size-5" strokeWidth={2.5} />
                    <span
                        className="pointer-events-none absolute inset-0 animate-ping rounded-full opacity-20"
                        style={{ border: `2px solid ${HUB_BLUE}` }}
                    />
                </div>
            </div>
        </div>
    );
}
