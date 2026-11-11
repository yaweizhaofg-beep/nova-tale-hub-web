import type { ReactNode } from "react";
import { Focus, Map, Minus, Plus } from "canvas-lucide";
import { Popover } from "antd";

import { canvasThemes } from "@canvas/lib/canvas-theme";
import { useCanvasSidePanelStore } from "@canvas/stores/use-canvas-side-panel-store";
import { useThemeStore } from "@canvas/stores/use-theme-store";

type CanvasZoomControlsProps = {
    scale: number;
    onScaleChange: (scale: number) => void;
    onReset: () => void;
    isMiniMapOpen: boolean;
    onToggleMiniMap: () => void;
    children?: ReactNode;
};

const zoomButton = "grid size-6 shrink-0 place-items-center rounded-md transition hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-35";

export function CanvasZoomControls({ scale, onScaleChange, onReset, isMiniMapOpen, onToggleMiniMap, children }: CanvasZoomControlsProps) {
    const panelOpen = useCanvasSidePanelStore((state) => state.panelOpen);
    const theme = canvasThemes[useThemeStore((state) => state.theme)];
    const zoomPercent = Math.round(scale * 100);

    return (
        <div role="group" aria-label="画布视图" data-canvas-no-zoom
            className={`absolute z-50 w-[194px] overflow-hidden rounded-[10px] border shadow-xl ${panelOpen ? "bottom-20 right-4" : "bottom-4 right-14"}`}
            style={{ background: theme.toolbar.panel, borderColor: theme.toolbar.border, color: theme.toolbar.item }}
            onMouseDown={(event) => event.stopPropagation()} onPointerDown={(event) => event.stopPropagation()}>
            {isMiniMapOpen && children}
            <div className="flex h-9 items-center gap-0.5 px-1.5">
                <button type="button" className={zoomButton} aria-label="缩小画布" title="缩小画布"
                    disabled={scale <= 0.05} onClick={() => onScaleChange(scale - 0.1)}><Minus className="size-3" /></button>
                <Popover trigger="click" placement="top" content={(
                    <input type="range" min="5" max="500" step="1" value={zoomPercent} className="w-36"
                        style={{ accentColor: theme.node.activeStroke }} aria-label="放大/缩小画布"
                        onChange={(event) => onScaleChange(Number(event.target.value) / 100)} />
                )}>
                    <button type="button" className="h-6 flex-1 rounded-md text-[11px] font-semibold tabular-nums hover:bg-black/5 dark:hover:bg-white/10"
                        title="调整缩放比例" aria-label={`调整缩放比例，当前 ${zoomPercent}%`}>{zoomPercent}%</button>
                </Popover>
                <button type="button" className={zoomButton} aria-label="放大画布" title="放大画布"
                    disabled={scale >= 5} onClick={() => onScaleChange(scale + 0.1)}><Plus className="size-3" /></button>
                <span aria-hidden className="mx-0.5 h-3 w-px" style={{ background: theme.toolbar.border }} />
                <button type="button" className={zoomButton} aria-label="重置视图" title="重置视图" onClick={onReset}><Focus className="size-3.5" /></button>
                <button type="button" className={zoomButton} aria-label={isMiniMapOpen ? "关闭小地图" : "打开小地图"}
                    title={isMiniMapOpen ? "关闭小地图" : "打开小地图"} aria-pressed={isMiniMapOpen}
                    style={isMiniMapOpen ? { color: theme.toolbar.activeText, background: theme.toolbar.activeBg } : undefined}
                    onClick={onToggleMiniMap}><Map className="size-3.5" /></button>
            </div>
        </div>
    );
}
