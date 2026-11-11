import { useEffect, useRef, useState } from "react";
import { BarChart3, ChevronDown, Download, Home, Images, Pencil, Plus, Redo2, Save, Trash2, Undo2, Upload, X, Zap } from "canvas-lucide";
import { Dropdown, Tooltip } from "antd";
import { useQuery } from "@tanstack/react-query";

import { getToken, getUsername } from "@canvas/lib/auth-token";
import { canvasThemes } from "@canvas/lib/canvas-theme";
import { fetchProfilePoints } from "@canvas/services/api/backend-client";
import { useThemeStore } from "@canvas/stores/use-theme-store";
import { CanvasTeamPopover } from "./canvas-team-popover";

const topButton = "grid size-7 shrink-0 place-items-center rounded-[7px] border transition enabled:hover:brightness-125 disabled:opacity-30";

export function CanvasTopBar({
    projectId,
    title,
    titleDraft,
    isTitleEditing,
    onTitleDraftChange,
    onStartTitleEditing,
    onFinishTitleEditing,
    onCancelTitleEditing,
    canUndo,
    canRedo,
    nodeCount,
    edgeCount,
    saving,
    onSave,
    onHome,
    onProjects,
    onManageTeam,
    onCreateProject,
    onDeleteProject,
    onExportProject,
    onImportImage,
    onUndo,
    onRedo,
}: {
    projectId: string;
    title: string;
    titleDraft: string;
    isTitleEditing: boolean;
    onTitleDraftChange: (value: string) => void;
    onStartTitleEditing: () => void;
    onFinishTitleEditing: () => void;
    onCancelTitleEditing: () => void;
    canUndo: boolean;
    canRedo: boolean;
    nodeCount: number;
    edgeCount: number;
    saving: boolean;
    onSave: () => void;
    onHome: () => void;
    onProjects: () => void;
    onManageTeam: () => void;
    onCreateProject: () => void;
    onDeleteProject: () => void;
    onExportProject: () => void;
    onImportImage: () => void;
    onUndo: () => void;
    onRedo: () => void;
}) {
    const colorTheme = useThemeStore((state) => state.theme);
    const theme = canvasThemes[colorTheme];
    const titleRef = useRef<HTMLDivElement>(null);
    const [menuOpen, setMenuOpen] = useState(false);
    const controlStyle = { borderColor: theme.toolbar.border, backgroundColor: theme.toolbar.itemHover, color: theme.toolbar.item };

    useEffect(() => {
        if (!isTitleEditing) return;
        const close = (event: PointerEvent) => {
            if (!titleRef.current?.contains(event.target as Node)) onFinishTitleEditing();
        };
        document.addEventListener("pointerdown", close, true);
        return () => document.removeEventListener("pointerdown", close, true);
    }, [isTitleEditing, onFinishTitleEditing]);

    return (
        <div className="relative z-50 flex h-[52px] shrink-0 items-center justify-between gap-1.5 border-b px-3" style={{ background: theme.toolbar.panel, borderColor: theme.toolbar.border }}>
            <div className="flex min-w-0 items-center gap-1.5">
                <Tooltip title="关闭画布">
                    <button type="button" aria-label="关闭画布" onClick={onProjects}
                        className={topButton} style={controlStyle}>
                        <X className="size-3.5" />
                    </button>
                </Tooltip>
                <span className="h-[18px] w-px shrink-0" style={{ background: theme.toolbar.border }} />
                <div ref={titleRef} className="flex min-w-0 items-center">
                    {isTitleEditing ? (
                        <input
                            autoFocus
                            aria-label="画布名称"
                            value={titleDraft}
                            onChange={(event) => onTitleDraftChange(event.target.value)}
                            onBlur={onFinishTitleEditing}
                            onKeyDown={(event) => {
                                if (event.key === "Enter") onFinishTitleEditing();
                                if (event.key === "Escape") onCancelTitleEditing();
                            }}
                            className="w-40 min-w-0 rounded-md border px-2 py-0.5 text-[13px] font-semibold"
                            style={{ ...controlStyle, color: theme.node.text }}
                        />
                    ) : (
                        <Dropdown placement="bottomLeft" trigger={["click"]} autoFocus open={menuOpen} onOpenChange={setMenuOpen}
                            menu={{
                                items: [
                                    { key: "home", icon: <Home className="size-4" />, label: "主页", onClick: onHome },
                                    { key: "projects", icon: <Images className="size-4" />, label: "我的画布", onClick: onProjects },
                                    { type: "divider" },
                                    { key: "new", icon: <Plus className="size-4" />, label: "新建画布", onClick: onCreateProject },
                                    { key: "rename", icon: <Pencil className="size-4" />, label: "重命名画布", onClick: onStartTitleEditing },
                                    { key: "delete", danger: true, disabled: saving, icon: <Trash2 className="size-4" />, label: "删除当前画布", onClick: onDeleteProject },
                                    { type: "divider" },
                                    { key: "import", icon: <Upload className="size-4" />, label: "导入资产", onClick: onImportImage },
                                    { key: "export", icon: <Download className="size-4" />, label: "导出当前画布", onClick: onExportProject },
                                    { type: "divider" },
                                    { key: "undo", disabled: !canUndo, icon: <Undo2 className="size-4" />, label: <MenuLabel text="撤销" shortcut="⌘ Z" />, onClick: onUndo },
                                    { key: "redo", disabled: !canRedo, icon: <Redo2 className="size-4" />, label: <MenuLabel text="重做" shortcut="⌘ ⇧ Z / ⌘ Y" />, onClick: onRedo },
                                ],
                            }}>
                            <button type="button" aria-haspopup="menu" aria-expanded={menuOpen} title={title}
                                className="flex h-7 min-w-0 max-w-[260px] items-center gap-1.5 rounded-md px-1.5 text-left text-[13px] font-semibold transition-colors hover:bg-black/5 aria-expanded:bg-black/5 dark:hover:bg-white/10 dark:aria-expanded:bg-white/10">
                                <span className="truncate">{title}</span>
                                <ChevronDown aria-hidden className="size-3 shrink-0 opacity-65" />
                            </button>
                        </Dropdown>
                    )}
                </div>
            </div>

            <div className="flex shrink-0 items-center gap-[5px]">
                <span className="hidden h-6 items-center gap-1 rounded-md border px-2 text-[11px] sm:inline-flex" style={controlStyle}><BarChart3 className="size-3" />{nodeCount} 节点 · {edgeCount} 连线</span>
                <button type="button" aria-label="撤销" title="撤销" disabled={!canUndo} onClick={onUndo}
                    className={topButton} style={controlStyle}><Undo2 className="size-3.5" /></button>
                <button type="button" aria-label="重做" title="重做" disabled={!canRedo} onClick={onRedo}
                    className={topButton} style={controlStyle}><Redo2 className="size-3.5" /></button>
                <span className="hidden h-[18px] w-px sm:block" style={{ background: theme.toolbar.border }} />
                <CanvasNetPoints key={projectId} projectId={projectId} />
                <CanvasTeamPopover theme={theme} onManage={onManageTeam} />
                <button type="button" title="保存到云端" disabled={saving} onClick={onSave}
                    className="inline-flex h-7 items-center gap-1 rounded-[7px] border px-3 text-xs font-semibold transition hover:brightness-125 disabled:opacity-45"
                    style={{ background: theme.toolbar.activeBg, color: theme.toolbar.activeText, borderColor: theme.toolbar.border }}>
                    <Save className="size-3.5" />{saving ? "保存中…" : "保存"}
                </button>
            </div>
        </div>
    );
}

function CanvasNetPoints({ projectId }: { projectId: string }) {
    const username = getUsername();
    const loggedIn = Boolean(getToken());
    const colorTheme = useThemeStore((state) => state.theme);
    const baselineKey = `canvas-net-points:${username}:${projectId}`;
    const mountedAtRef = useRef(Date.now());
    const [baseline, setBaseline] = useState<number | null>(() => {
        const stored = sessionStorage.getItem(baselineKey);
        if (stored == null) return null;
        const value = Number(stored);
        return Number.isFinite(value) ? value : null;
    });
    const pointsQuery = useQuery({
        queryKey: ["canvas-net-points", username, projectId],
        queryFn: fetchProfilePoints,
        enabled: loggedIn,
        staleTime: 0,
        refetchInterval: 5_000,
        refetchOnMount: "always",
        refetchOnWindowFocus: true,
        notifyOnChangeProps: ["data", "dataUpdatedAt"],
    });
    const currentBalance = Number(pointsQuery.data?.pointsBalance);

    useEffect(() => {
        if (baseline != null || pointsQuery.dataUpdatedAt < mountedAtRef.current || !Number.isFinite(currentBalance)) return;
        sessionStorage.setItem(baselineKey, String(currentBalance));
        setBaseline(currentBalance);
    }, [baseline, baselineKey, currentBalance, pointsQuery.dataUpdatedAt]);

    if (!loggedIn) return null;
    const netPoints = baseline != null && Number.isFinite(currentBalance) ? Math.max(0, baseline - currentBalance) : null;
    const text = netPoints == null ? "…" : netPoints.toLocaleString("zh-CN", { minimumFractionDigits: 0, maximumFractionDigits: 4 });

    return (
        <span
            className="hidden h-6 shrink-0 items-center gap-1 rounded-md border px-2 text-[11px] sm:inline-flex"
            style={{ color: canvasThemes[colorTheme].toolbar.item, background: canvasThemes[colorTheme].toolbar.itemHover, borderColor: canvasThemes[colorTheme].toolbar.border }}
            title="本次浏览会话进入当前画布后的净消耗；退款会自动抵扣"
        >
            <Zap className="size-3" />
            <span className="font-semibold tabular-nums">{text}</span>
            <span>积分</span>
        </span>
    );
}

function MenuLabel({ text, shortcut }: { text: string; shortcut: string }) {
    return (
        <span className="flex min-w-36 items-center justify-between gap-8">
            <span>{text}</span>
            <span className="text-xs opacity-45">{shortcut}</span>
        </span>
    );
}
