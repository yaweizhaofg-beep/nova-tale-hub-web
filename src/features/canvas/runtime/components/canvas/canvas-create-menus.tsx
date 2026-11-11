import { useEffect, useRef } from "react";
import { ImageIcon, List, Music2, Settings2, Video, X } from "canvas-lucide";

import { canvasNodeColor, canvasThemes, type CanvasTheme } from "@canvas/lib/canvas-theme";
import { useThemeStore } from "@canvas/stores/use-theme-store";
import { listNodeDefinitions, useNodeRegistryVersion } from "@canvas/lib/canvas/node-registry";
import { CanvasNodeType, type CanvasNodeTypeId, type ConnectionHandle, type Position } from "@canvas/types/canvas";

const menuClassName = "absolute z-[120] flex w-[222px] max-w-[calc(100%-16px)] flex-col overflow-hidden rounded-[14px] border shadow-2xl";
const headerClassName = "flex h-10 shrink-0 items-center justify-between border-b px-3 text-[11px] font-semibold";

function menuStyle(position: Position, theme: CanvasTheme) {
    return {
        left: `clamp(8px, ${position.x}px, calc(100% - 230px))`,
        top: `clamp(8px, ${position.y}px, max(8px, calc(100% - 350px)))`,
        maxHeight: "min(342px, calc(100% - 16px))",
        background: theme.node.fill,
        borderColor: theme.node.stroke,
        color: theme.node.text,
    };
}

const nodeDescriptions: Partial<Record<CanvasNodeType, string>> = {
    [CanvasNodeType.Text]: "提示词和脚本描述",
    [CanvasNodeType.Image]: "上传或生成图片",
    [CanvasNodeType.Video]: "上传或生成视频",
    [CanvasNodeType.Audio]: "配乐、音效和配音",
    [CanvasNodeType.Config]: "设置模型和生成参数",
    [CanvasNodeType.Group]: "整理画布节点",
};

export type PendingConnectionCreate = {
    connection: ConnectionHandle;
    position: Position;
};

export function ConnectionCreateMenu({
    screenPosition,
    onCreate,
    onClose,
}: {
    screenPosition: Position;
    onCreate: (type: CanvasNodeType.Image | CanvasNodeType.Text | CanvasNodeType.Config | CanvasNodeType.Video | CanvasNodeType.Audio) => void;
    onClose: () => void;
}) {
    const theme = canvasThemes[useThemeStore((state) => state.theme)];
    return (
        <div
            className={menuClassName}
            data-connection-create-menu
            data-canvas-no-zoom
            style={menuStyle(screenPosition, theme)}
            onMouseDown={(event) => event.stopPropagation()}
            onPointerDown={(event) => event.stopPropagation()}
        >
            <div className={headerClassName} style={{ borderColor: theme.node.stroke }}>
                <span style={{ color: theme.node.muted }}>
                    引用该节点生成
                </span>
                <button type="button" className="grid size-7 place-items-center rounded-lg text-base opacity-55 transition hover:bg-white/10 hover:opacity-100" onClick={onClose} aria-label="关闭">
                    ×
                </button>
            </div>
            <div className="thin-scrollbar min-h-0 overflow-y-auto p-1.5">
                <ConnectionCreateOption theme={theme} type={CanvasNodeType.Text} icon={<List />} title="文本节点" onClick={() => onCreate(CanvasNodeType.Text)} />
                <ConnectionCreateOption theme={theme} type={CanvasNodeType.Image} icon={<ImageIcon />} title="图片生成" onClick={() => onCreate(CanvasNodeType.Image)} />
                <ConnectionCreateOption theme={theme} type={CanvasNodeType.Video} icon={<Video />} title="视频生成" onClick={() => onCreate(CanvasNodeType.Video)} />
                <ConnectionCreateOption theme={theme} type={CanvasNodeType.Audio} icon={<Music2 />} title="音频节点" onClick={() => onCreate(CanvasNodeType.Audio)} />
                <ConnectionCreateOption theme={theme} type={CanvasNodeType.Config} icon={<Settings2 />} title="配置节点" onClick={() => onCreate(CanvasNodeType.Config)} />
            </div>
        </div>
    );
}

function ConnectionCreateOption({ theme, type, icon, title, description, onClick }: { theme: CanvasTheme; type: CanvasNodeTypeId; icon: React.ReactNode; title: string; description?: string; onClick: () => void }) {
    const accent = canvasNodeColor(type, theme.node.activeStroke);
    const subtitle = description ?? nodeDescriptions[type as CanvasNodeType];
    return (
        <button
            type="button"
            className="flex h-11 w-full cursor-pointer items-center gap-2 rounded-lg px-2 text-left transition hover:bg-black/5 dark:hover:bg-white/5"
            style={{ color: theme.node.text }}
            onClick={onClick}
        >
            <span aria-hidden className="grid size-6 shrink-0 place-items-center rounded-md border [&>svg]:size-3.5" style={{ background: accent + "14", borderColor: accent + "38", color: accent }}>
                {icon}
            </span>
            <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-semibold leading-4">{title}</span>
                {typeof subtitle === "string" && subtitle ? (
                    <span className="block truncate text-[10px]" style={{ color: theme.node.faint }}>
                        {subtitle}
                    </span>
                ) : null}
            </span>
        </button>
    );
}

export function NodeCreateMenu({ screenPosition, onCreate, onClose }: { screenPosition: Position; onCreate: (type: string) => void; onClose: () => void }) {
    const theme = canvasThemes[useThemeStore((state) => state.theme)];
    useNodeRegistryVersion();
    const menuRef = useRef<HTMLDivElement>(null);
    const definitions = listNodeDefinitions().filter((def) => def.showInCreateMenu !== false);
    // 点击菜单外的空白处自动关闭
    useEffect(() => {
        const handlePointerDown = (event: PointerEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) onClose();
        };
        document.addEventListener("pointerdown", handlePointerDown, true);
        return () => document.removeEventListener("pointerdown", handlePointerDown, true);
    }, [onClose]);
    return (
        <div
            ref={menuRef}
            role="group"
            aria-label="选择节点"
            className={menuClassName}
            data-canvas-no-zoom
            style={menuStyle(screenPosition, theme)}
            onPointerDown={(event) => event.stopPropagation()}
        >
            <div className={headerClassName} style={{ borderColor: theme.node.stroke }}>
                <span style={{ color: theme.node.muted }}>
                    选择节点
                </span>
                <button type="button" className="grid size-7 place-items-center rounded-lg opacity-55 transition hover:opacity-100" onClick={onClose} aria-label="关闭">
                    <X className="size-4" />
                </button>
            </div>
            <div className="thin-scrollbar min-h-0 overflow-y-auto p-1.5">
                {definitions.map((def) => (
                    <ConnectionCreateOption key={def.type} theme={theme} type={def.type} icon={def.icon} title={def.title} description={def.description} onClick={() => onCreate(def.type)} />
                ))}
            </div>
        </div>
    );
}
