import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import { hasAssetDragData } from "@canvas/lib/canvas/canvas-asset-dnd";
import { canvasSpacePressedRef } from "@canvas/lib/canvas/canvas-space-pan";
import { canvasThemes, type CanvasBackgroundMode, type CanvasTheme } from "@canvas/lib/canvas-theme";
import { useThemeStore } from "@canvas/stores/use-theme-store";
import type { ViewportTransform } from "@canvas/types/canvas";

export type CanvasInteractionMode = "select" | "move";

type InfiniteCanvasProps = {
    containerRef: React.RefObject<HTMLDivElement>;
    viewport: ViewportTransform;
    interactionMode: CanvasInteractionMode;
    backgroundMode?: CanvasBackgroundMode;
    onViewportChange: (viewport: ViewportTransform) => void;
    onViewportFrame?: (viewport: ViewportTransform) => void;
    onGestureChange?: (active: boolean) => void;
    onCanvasMouseDown?: (event: React.PointerEvent<HTMLDivElement>) => void;
    onCanvasDeselect?: () => void;
    onCanvasDoubleClick?: (event: React.MouseEvent<HTMLDivElement>) => void;
    onKeyboardMenu?: () => void;
    onContextMenu?: (event: React.MouseEvent) => void;
    onDrop?: (event: React.DragEvent<HTMLDivElement>) => void;
    children: React.ReactNode;
};

function gridStyle({ x, y, k }: ViewportTransform, mode: CanvasBackgroundMode, theme: CanvasTheme) {
    if (mode === "dots") {
        const fine = 20 * k;
        const coarse = 100 * k;
        return {
            backgroundImage: `radial-gradient(circle, ${theme.canvas.dot} .85px, transparent 1.4px), radial-gradient(circle, ${theme.canvas.line} .45px, transparent .8px)`,
            backgroundSize: `${coarse}px ${coarse}px, ${fine}px ${fine}px`,
            backgroundPosition: `${x % coarse - coarse / 2}px ${y % coarse - coarse / 2}px, ${x % fine - fine / 2}px ${y % fine - fine / 2}px`,
        };
    }
    const size = 48 * k;
    return {
        backgroundImage: `linear-gradient(${theme.canvas.line} 1px, transparent 1px), linear-gradient(90deg, ${theme.canvas.line} 1px, transparent 1px)`,
        backgroundSize: `${size}px ${size}px`,
        backgroundPosition: `${x % size}px ${y % size}px`,
    };
}

export function InfiniteCanvas({ containerRef, viewport, interactionMode, backgroundMode = "lines", onViewportChange, onViewportFrame, onGestureChange, onCanvasMouseDown, onCanvasDeselect, onCanvasDoubleClick, onKeyboardMenu, onContextMenu, onDrop, children }: InfiniteCanvasProps) {
    const theme = canvasThemes[useThemeStore((state) => state.theme)];
    const panState = useRef({
        isPanning: false,
        pointerId: -1,
        startX: 0,
        startY: 0,
        initialX: 0,
        initialY: 0,
        hasMoved: false,
        deselectOnClick: false,
    });
    const scaleRef = useRef(viewport.k);
    const frameRef = useRef<number | null>(null);
    const wheelTimerRef = useRef<number | null>(null);
    const nextViewportRef = useRef<ViewportTransform | null>(null);
    const liveRef = useRef(viewport);
    const committedRef = useRef(viewport);
    const gesturingRef = useRef(false);
    const worldRef = useRef<HTMLDivElement>(null);
    const gridRef = useRef<HTMLDivElement>(null);
    const onViewportChangeRef = useRef(onViewportChange);
    onViewportChangeRef.current = onViewportChange;
    const onViewportFrameRef = useRef(onViewportFrame);
    onViewportFrameRef.current = onViewportFrame;
    const onGestureChangeRef = useRef(onGestureChange);
    onGestureChangeRef.current = onGestureChange;
    const onCanvasDeselectRef = useRef(onCanvasDeselect);
    onCanvasDeselectRef.current = onCanvasDeselect;
    const [isSpacePressed, setIsSpacePressed] = useState(false);

    useEffect(() => {
        if (gesturingRef.current) return;
        scaleRef.current = viewport.k;
    }, [viewport.k]);

    const paint = useCallback((next: ViewportTransform) => {
        const world = worldRef.current;
        if (world) world.style.transform = `translate(${next.x}px, ${next.y}px) scale(${next.k})`;
        const grid = gridRef.current;
        if (!grid || backgroundMode === "blank") return;
        Object.assign(grid.style, gridStyle(next, backgroundMode, theme));
    }, [backgroundMode, theme]);

    const shouldCommit = (next: ViewportTransform) => {
        const last = committedRef.current;
        return Math.hypot(next.x - last.x, next.y - last.y) > 320 || Math.abs(next.k - last.k) > 0.12;
    };

    const commitViewport = (next: ViewportTransform) => {
        committedRef.current = next;
        onViewportChangeRef.current(next);
    };

    const publishFrame = (next: ViewportTransform) => {
        liveRef.current = next;
        scaleRef.current = next.k;
        nextViewportRef.current = next;
        paint(next);
        onViewportFrameRef.current?.(next);
        if (shouldCommit(next)) commitViewport(next);
    };

    const publishRef = useRef(publishFrame);
    publishRef.current = publishFrame;

    useLayoutEffect(() => {
        if (gesturingRef.current) {
            paint(liveRef.current);
            return;
        }
        liveRef.current = viewport;
        committedRef.current = viewport;
        scaleRef.current = viewport.k;
    }, [paint, viewport]);

    useEffect(
        () => () => {
            if (frameRef.current) cancelAnimationFrame(frameRef.current);
            if (wheelTimerRef.current) window.clearTimeout(wheelTimerRef.current);
        },
        [],
    );

    useEffect(() => {
        const handlesSpaceKey = (target: EventTarget | null) => {
            if (target instanceof HTMLInputElement && target.type === "range") return false;
            return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement ||
                (target instanceof HTMLElement && (target.isContentEditable || target.hasAttribute("data-canvas-mode-button")));
        };

        const endPan = (opts?: { deselectIfClick?: boolean }) => {
            if (!panState.current.isPanning) {
                document.body.style.cursor = "";
                return;
            }
            if (opts?.deselectIfClick && panState.current.deselectOnClick && !panState.current.hasMoved) {
                onCanvasDeselectRef.current?.();
            }
            const moved = panState.current.hasMoved;
            const next = nextViewportRef.current;
            const pointerId = panState.current.pointerId;
            panState.current.isPanning = false;
            panState.current.pointerId = -1;
            document.body.style.cursor = "";
            const el = containerRef.current;
            if (el && pointerId >= 0) {
                try {
                    if (el.hasPointerCapture?.(pointerId)) el.releasePointerCapture(pointerId);
                } catch {
                    /* ignore */
                }
            }
            if (moved && next) {
                committedRef.current = next;
                onViewportChangeRef.current(next);
            }
            if (gesturingRef.current && !wheelTimerRef.current) {
                gesturingRef.current = false;
                onGestureChangeRef.current?.(false);
            }
        };

        const releaseInteraction = () => {
            canvasSpacePressedRef.current = false;
            setIsSpacePressed(false);
            if (wheelTimerRef.current) {
                window.clearTimeout(wheelTimerRef.current);
                wheelTimerRef.current = null;
            }
            endPan();
            if (gesturingRef.current) {
                const next = nextViewportRef.current;
                if (next) {
                    committedRef.current = next;
                    onViewportChangeRef.current(next);
                }
                gesturingRef.current = false;
                onGestureChangeRef.current?.(false);
            }
        };

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.code !== "Space") return;
            if (handlesSpaceKey(event.target)) return;
            // 捕获阶段拦截，避免聚焦的 video/audio 把空格当成播放/暂停
            event.preventDefault();
            const active = document.activeElement;
            if (active instanceof HTMLVideoElement || active instanceof HTMLAudioElement || (active instanceof HTMLInputElement && active.type === "range")) {
                active.blur();
            }
            if (event.repeat) return;
            canvasSpacePressedRef.current = true;
            setIsSpacePressed(true);
        };

        const handleKeyUp = (event: KeyboardEvent) => {
            if (event.code !== "Space") return;
            // 无论焦点是否已落到输入框，都要释放平移态，否则空格会卡住
            canvasSpacePressedRef.current = false;
            setIsSpacePressed(false);
            if (handlesSpaceKey(event.target)) return;
            event.preventDefault();
        };

        const handlePointerMove = (event: PointerEvent) => {
            if (!panState.current.isPanning || event.pointerId !== panState.current.pointerId) return;
            // 失焦后常收不到 pointerup，按键抬起后 buttons 为 0，应结束平移
            if (event.buttons === 0) {
                endPan({ deselectIfClick: true });
                return;
            }

            const dx = event.clientX - panState.current.startX;
            const dy = event.clientY - panState.current.startY;
            if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
                if (!panState.current.hasMoved) {
                    panState.current.hasMoved = true;
                    if (!gesturingRef.current) {
                        gesturingRef.current = true;
                        onGestureChangeRef.current?.(true);
                    }
                }
            }

            nextViewportRef.current = {
                x: panState.current.initialX + dx,
                y: panState.current.initialY + dy,
                k: scaleRef.current,
            };
            if (frameRef.current) return;
            frameRef.current = requestAnimationFrame(() => {
                frameRef.current = null;
                if (nextViewportRef.current) publishRef.current(nextViewportRef.current);
            });
        };

        const handlePointerUp = (event: PointerEvent) => {
            if (event.pointerId === panState.current.pointerId) endPan({ deselectIfClick: event.type === "pointerup" });
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === "hidden") releaseInteraction();
        };

        window.addEventListener("keydown", handleKeyDown, true);
        window.addEventListener("keyup", handleKeyUp, true);
        window.addEventListener("pointermove", handlePointerMove);
        window.addEventListener("pointerup", handlePointerUp);
        window.addEventListener("pointercancel", handlePointerUp);
        window.addEventListener("blur", releaseInteraction);
        window.addEventListener("pagehide", releaseInteraction);
        document.addEventListener("visibilitychange", handleVisibilityChange);
        return () => {
            window.removeEventListener("keydown", handleKeyDown, true);
            window.removeEventListener("keyup", handleKeyUp, true);
            window.removeEventListener("pointermove", handlePointerMove);
            window.removeEventListener("pointerup", handlePointerUp);
            window.removeEventListener("pointercancel", handlePointerUp);
            window.removeEventListener("blur", releaseInteraction);
            window.removeEventListener("pagehide", releaseInteraction);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            releaseInteraction();
        };
    }, [containerRef]);

    const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
        const target = event.target instanceof Element ? event.target : null;
        if (target?.closest("[data-canvas-no-zoom],.ant-modal,.ant-popover,.ant-dropdown,.ant-select-dropdown,.ant-picker-dropdown")) return;
        event.preventDefault();

        const current = liveRef.current;
        const delta = -event.deltaY;
        const factor = Math.pow(1.1, delta / 100);
        const newScale = Math.min(Math.max(current.k * factor, 0.05), 5);
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;

        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;
        const worldX = (mouseX - current.x) / current.k;
        const worldY = (mouseY - current.y) / current.k;
        const next = {
            x: mouseX - worldX * newScale,
            y: mouseY - worldY * newScale,
            k: newScale,
        };
        if (!gesturingRef.current) {
            gesturingRef.current = true;
            onGestureChange?.(true);
        }
        publishFrame(next);
        if (wheelTimerRef.current) window.clearTimeout(wheelTimerRef.current);
        wheelTimerRef.current = window.setTimeout(() => {
            wheelTimerRef.current = null;
            const latest = liveRef.current;
            committedRef.current = latest;
            onViewportChange(latest);
            if (!panState.current.isPanning) {
                gesturingRef.current = false;
                onGestureChange?.(false);
            }
        }, 120);
    };

    const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
        if (!event.isPrimary || panState.current.isPanning) return;
        const target = event.target instanceof Element ? event.target : null;
        if (target && (!event.currentTarget.contains(target) || target.closest("[data-canvas-no-zoom],[data-connection-create-menu]"))) return;
        const isBackgroundClick = !target?.closest("[data-node-id],[data-connection-id],[data-canvas-connect-hub]");

        const shortcutPan = event.button === 1 || (event.button === 0 && canvasSpacePressedRef.current);
        const moveDrag = interactionMode === "move" && event.button === 0 &&
            !target?.closest("button, input, textarea, select, a[href], [role='button'], [contenteditable]:not([contenteditable='false'])");
        if (shortcutPan || moveDrag) {
            event.preventDefault();
            event.currentTarget.setPointerCapture(event.pointerId);
            panState.current = {
                isPanning: true,
                pointerId: event.pointerId,
                startX: event.clientX,
                startY: event.clientY,
                initialX: liveRef.current.x,
                initialY: liveRef.current.y,
                hasMoved: false,
                deselectOnClick: shortcutPan,
            };
            document.body.style.cursor = "grabbing";
            return;
        }

        // 素材选择：左键点空白取消选中 / 拖动框选
        if (interactionMode === "select" && event.button === 0 && isBackgroundClick) {
            event.preventDefault();
            event.currentTarget.setPointerCapture(event.pointerId);
            onCanvasMouseDown?.(event);
        }
    };

    const handleDoubleClick = (event: React.MouseEvent<HTMLDivElement>) => {
        // 移动模式捕获指针后，双击事件可能落到容器上，需重新判断是否点在空白处。
        const eventTarget = event.target instanceof Element ? event.target : null;
        const target = interactionMode === "move"
            ? document.elementFromPoint(event.clientX, event.clientY)
            : eventTarget;
        if (target && (!event.currentTarget.contains(target) || target.closest("[data-canvas-no-zoom],[data-node-id],[data-connection-id]"))) return;
        onCanvasDoubleClick?.(event);
    };

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        // 阻止画布滚动导致页面滚动;但浮层(创建菜单/弹窗等)内允许原生滚动
        const preventWheelScroll = (event: WheelEvent) => {
            const target = event.target instanceof Element ? event.target : null;
            if (target?.closest("[data-canvas-no-zoom],.ant-modal,.ant-popover,.ant-dropdown,.ant-select-dropdown,.ant-picker-dropdown")) return;
            event.preventDefault();
        };
        container.addEventListener("wheel", preventWheelScroll, { passive: false });
        return () => container.removeEventListener("wheel", preventWheelScroll);
    }, [containerRef]);

    return (
        <div
            ref={containerRef}
            role="region"
            aria-label="画布编辑区"
            tabIndex={0}
            onKeyDown={(event) => {
                if (event.target !== event.currentTarget) return;
                if (event.key === "ContextMenu" || (event.shiftKey && event.key === "F10")) {
                    event.preventDefault();
                    onKeyboardMenu?.();
                }
            }}
            className={`relative h-full w-full select-none overflow-hidden ${interactionMode === "move" ? "touch-none" : ""} ${isSpacePressed || interactionMode === "move" ? "cursor-grab" : "cursor-default"}`}
            style={{ background: theme.canvas.background }}
            onPointerDown={handlePointerDown}
            onDoubleClick={handleDoubleClick}
            onWheel={handleWheel}
            onContextMenu={onContextMenu}
            onDragOver={(event) => {
                event.preventDefault();
                if (hasAssetDragData(event.dataTransfer) || event.dataTransfer.types.includes("Files")) {
                    event.dataTransfer.dropEffect = "copy";
                }
            }}
            onDrop={onDrop}
        >
            <CanvasGrid viewport={viewport} mode={backgroundMode} layerRef={gridRef} />
            <div
                ref={worldRef}
                className="absolute origin-top-left"
                style={{
                    transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.k})`,
                }}
            >
                {children}
            </div>
        </div>
    );
}

function CanvasGrid({ viewport, mode, layerRef }: { viewport: ViewportTransform; mode: CanvasBackgroundMode; layerRef: React.RefObject<HTMLDivElement> }) {
    const theme = canvasThemes[useThemeStore((state) => state.theme)];
    if (mode === "blank") return null;

    return (
        <div
            ref={layerRef}
            className="pointer-events-none absolute inset-0 opacity-40"
            style={gridStyle(viewport, mode, theme)}
        />
    );
}
