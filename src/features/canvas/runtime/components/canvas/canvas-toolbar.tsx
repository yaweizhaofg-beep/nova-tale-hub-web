import type { CSSProperties, ReactNode } from "react";
import { Eraser, Image as ImageIcon, LayoutGrid, Mic, MousePointer2, Move, Sparkles, Type, Upload, Video } from "canvas-lucide";

import { colors } from "@/shared";
import { canvasThemes } from "@canvas/lib/canvas-theme";
import { useThemeStore } from "@canvas/stores/use-theme-store";
import type { CanvasInteractionMode } from "./infinite-canvas";

type Props = {
    interactionMode: CanvasInteractionMode;
    onInteractionModeChange: (mode: CanvasInteractionMode) => void;
    onAddImage: () => void;
    onAddVideo: () => void;
    onAddAudio: () => void;
    onAddText: () => void;
    onAddConfig: () => void;
    onAddGroup: () => void;
    onUpload: () => void;
    onClear: () => void;
};

export function CanvasToolbar({ interactionMode, onInteractionModeChange, onAddImage, onAddVideo, onAddAudio, onAddText, onAddConfig, onAddGroup, onUpload, onClear }: Props) {
    const mode = useThemeStore((state) => state.theme);
    const { node, toolbar } = canvasThemes[mode];
    const dark = mode === "dark";
    const dockStyle = {
        background: dark ? "rgba(12,13,18,.94)" : toolbar.panel,
        borderColor: dark ? "rgba(255,255,255,.09)" : toolbar.border,
        color: dark ? "#7d828e" : node.muted,
        "--canvas-dock-hover": toolbar.itemHover,
        "--canvas-dock-active-text": dark ? "#a4a8b3" : toolbar.item,
        "--canvas-dock-border": toolbar.border,
    } as CSSProperties;
    const divider = <span aria-hidden className="my-1 h-px w-[18px]" style={{ background: toolbar.border }} />;

    return (
        <div role="group" aria-label="画布工具" style={dockStyle}
            className="thin-scrollbar absolute left-4 top-1/2 z-50 flex max-h-[calc(100dvh-80px)] -translate-y-1/2 flex-col items-center gap-px overflow-y-auto rounded-2xl border px-[5px] py-[7px] shadow-xl dark:shadow-[0_8px_40px_rgba(0,0,0,.55),inset_0_1px_0_rgba(255,255,255,.06)] [&>*]:shrink-0">
            <ToolbarButton label="选择" pressed={interactionMode === "select"} onClick={() => onInteractionModeChange("select")}><MousePointer2 /></ToolbarButton>
            <ToolbarButton label="移动" pressed={interactionMode === "move"} onClick={() => onInteractionModeChange("move")}><Move /></ToolbarButton>
            {divider}
            <ToolbarButton label="文本" onClick={onAddText}><Type /></ToolbarButton>
            <ToolbarButton label="图片" onClick={onAddImage}><ImageIcon /></ToolbarButton>
            <ToolbarButton label="视频" onClick={onAddVideo}><Video /></ToolbarButton>
            <ToolbarButton label="音频" onClick={onAddAudio}><Mic /></ToolbarButton>
            <ToolbarButton label="生成配置" caption="配置" onClick={onAddConfig}><Sparkles /></ToolbarButton>
            <ToolbarButton label="分组" onClick={onAddGroup}><LayoutGrid /></ToolbarButton>
            {divider}
            <ToolbarButton label="上传资产" caption="上传" onClick={onUpload}><Upload /></ToolbarButton>
            {divider}
            <ToolbarButton label="清空画布" caption="清空" onClick={onClear} style={{ color: colors.error }}><Eraser /></ToolbarButton>
        </div>
    );
}

function ToolbarButton({ label, caption = label, pressed, onClick, style, children }: {
    label: string;
    caption?: string;
    pressed?: boolean;
    onClick: () => void;
    style?: CSSProperties;
    children: ReactNode;
}) {
    return (
        <button type="button" aria-label={label} aria-pressed={pressed} title={label} onClick={onClick} style={style}
            data-canvas-mode-button={pressed === undefined ? undefined : ""}
            className="flex h-[42px] w-[34px] cursor-pointer flex-col items-center justify-center gap-[3px] whitespace-nowrap rounded-[10px] border border-transparent !p-0 !text-[9.5px] leading-none tracking-[0.02em] transition-colors hover:bg-(--canvas-dock-hover) hover:text-(--canvas-dock-active-text) aria-pressed:border-(--canvas-dock-border) aria-pressed:bg-(--canvas-dock-hover) aria-pressed:font-bold aria-pressed:text-(--canvas-dock-active-text) [&_svg]:size-[15px] [&_svg]:shrink-0 [&_svg]:[stroke-width:1.5] aria-pressed:[&_svg]:[stroke-width:2]">
            <span aria-hidden>{children}</span>
            <span>{caption}</span>
        </button>
    );
}
