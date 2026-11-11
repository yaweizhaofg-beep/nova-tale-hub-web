import { useCallback, useMemo, useRef, useState } from "react";

import { canvasNodeColor, canvasThemes } from "@canvas/lib/canvas-theme";
import { useThemeStore } from "@canvas/stores/use-theme-store";
import { type CanvasNodeData, type ViewportTransform } from "@canvas/types/canvas";

export function Minimap({ nodes, viewport, viewportSize, onViewportChange }: { nodes: CanvasNodeData[]; viewport: ViewportTransform; viewportSize: { width: number; height: number }; onViewportChange: (viewport: ViewportTransform) => void }) {
    const theme = canvasThemes[useThemeStore((state) => state.theme)];
    const containerRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const width = 192;
    const height = 118;

    const { worldBounds, scale, offset } = useMemo(() => {
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;

        nodes.forEach((node) => {
            minX = Math.min(minX, node.position.x);
            minY = Math.min(minY, node.position.y);
            maxX = Math.max(maxX, node.position.x + node.width);
            maxY = Math.max(maxY, node.position.y + node.height);
        });

        const padding = nodes.length ? 50 : 500;
        minX = (nodes.length ? minX : 0) - padding;
        minY = (nodes.length ? minY : 0) - padding;
        maxX = (nodes.length ? maxX : 0) + padding;
        maxY = (nodes.length ? maxY : 0) + padding;

        const boundsWidth = maxX - minX;
        const boundsHeight = maxY - minY;
        const nextScale = Math.min(width / boundsWidth, height / boundsHeight);
        const mapContentW = boundsWidth * nextScale;
        const mapContentH = boundsHeight * nextScale;

        return {
            worldBounds: { x: minX, y: minY, w: boundsWidth, h: boundsHeight },
            scale: nextScale,
            offset: { x: (width - mapContentW) / 2, y: (height - mapContentH) / 2 },
        };
    }, [nodes]);

    const toMinimap = useCallback(
        (worldX: number, worldY: number) => {
            return {
                x: (worldX - worldBounds.x) * scale + offset.x,
                y: (worldY - worldBounds.y) * scale + offset.y,
            };
        },
        [offset.x, offset.y, scale, worldBounds.x, worldBounds.y],
    );

    const toWorld = useCallback(
        (minimapX: number, minimapY: number) => {
            return {
                x: (minimapX - offset.x) / scale + worldBounds.x,
                y: (minimapY - offset.y) / scale + worldBounds.y,
            };
        },
        [offset.x, offset.y, scale, worldBounds.x, worldBounds.y],
    );

    const viewportRect = useMemo(() => {
        const vx = -viewport.x / viewport.k;
        const vy = -viewport.y / viewport.k;
        const vw = viewportSize.width / viewport.k;
        const vh = viewportSize.height / viewport.k;
        const p1 = toMinimap(vx, vy);
        const p2 = toMinimap(vx + vw, vy + vh);

        return {
            x: p1.x,
            y: p1.y,
            w: Math.max(p2.x - p1.x, 4),
            h: Math.max(p2.y - p1.y, 4),
        };
    }, [toMinimap, viewport.k, viewport.x, viewport.y, viewportSize.height, viewportSize.width]);

    const updateViewportFromEvent = (event: React.PointerEvent) => {
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;

        const world = toWorld(event.clientX - rect.left, event.clientY - rect.top);
        onViewportChange({
            x: viewportSize.width / 2 - world.x * viewport.k,
            y: viewportSize.height / 2 - world.y * viewport.k,
            k: viewport.k,
        });
    };

    return (
        <div className="border-b" style={{ borderColor: theme.toolbar.border }}>
            <div className="grid h-3.5 place-items-center border-b" style={{ borderColor: theme.toolbar.border }}>
                <span className="h-px w-6 rounded-full" style={{ background: theme.toolbar.border }} />
            </div>
            <div
                ref={containerRef}
                className="relative cursor-crosshair overflow-hidden"
                style={{ width, height }}
                onPointerDown={(event) => {
                    event.preventDefault();
                    event.currentTarget.setPointerCapture(event.pointerId);
                    setIsDragging(true);
                    updateViewportFromEvent(event);
                }}
                onPointerMove={(event) => {
                    if (isDragging) updateViewportFromEvent(event);
                }}
                onPointerUp={() => setIsDragging(false)}
                onLostPointerCapture={() => setIsDragging(false)}
            >
                {nodes.map((node) => {
                    const pos = toMinimap(node.position.x, node.position.y);
                    const color = canvasNodeColor(node.type, theme.node.muted);
                    return (
                        <div
                            key={node.id}
                            className="absolute rounded-[2px] border"
                            style={{
                                left: pos.x,
                                top: pos.y,
                                width: Math.max(node.width * scale, 2),
                                height: Math.max(node.height * scale, 2),
                                backgroundColor: `color-mix(in srgb, ${color} 20%, transparent)`,
                                borderColor: color,
                            }}
                        />
                    );
                })}
                <div className="pointer-events-none absolute rounded-[2px] border border-dashed" style={{ left: viewportRect.x, top: viewportRect.y, width: viewportRect.w, height: viewportRect.h, borderColor: theme.node.muted, background: theme.toolbar.itemHover }} />
            </div>
        </div>
    );
}
