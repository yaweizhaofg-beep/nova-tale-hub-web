import { ArrowUpRight, Check, Clock3, Download, HardDrive, Pencil, Trash2, X } from "canvas-lucide";
import { App, Button, Input, Tooltip } from "antd";

import { renameProjectOnCloud } from "@canvas/lib/canvas/canvas-cloud-save";
import { useCanvasStore, type CanvasProject } from "@canvas/stores/canvas/use-canvas-store";
import { useCanvasUiStore } from "@canvas/stores/canvas/use-canvas-ui-store";
import { CanvasProjectPreview } from "./canvas-project-preview";

const updatedAtFormat = new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
});

export function CanvasProjectCard({ project, onOpen, onExport }: {
    project: CanvasProject;
    onOpen: () => void;
    onExport: () => void;
}) {
    const { message } = App.useApp();
    const renameProject = useCanvasStore((state) => state.renameProject);
    const selected = useCanvasUiStore((state) => state.selectedProjectIds.includes(project.id));
    const editing = useCanvasUiStore((state) => state.editingProjectId === project.id);
    const editingTitle = useCanvasUiStore((state) => state.editingProjectId === project.id ? state.editingProjectTitle : "");
    const startEditing = useCanvasUiStore((state) => state.startEditingProject);
    const setEditingTitle = useCanvasUiStore((state) => state.setEditingProjectTitle);
    const stopEditing = useCanvasUiStore((state) => state.stopEditingProject);
    const toggleSelected = useCanvasUiStore((state) => state.toggleSelectedProjectId);
    const setDeleteIds = useCanvasUiStore((state) => state.setDeleteProjectIds);
    const updatedAt = new Date(project.updatedAt);
    const hasUpdatedAt = Number.isFinite(updatedAt.getTime());
    const saveTitle = () => {
        const nextTitle = editingTitle.trim();
        stopEditing();
        if (!nextTitle || nextTitle === project.title) return;
        renameProject(project.id, nextTitle);
        if (project.localOnly) return;
        void renameProjectOnCloud(project, nextTitle)
            .then((saved) => renameProject(saved.id, saved.title))
            .catch((error) => message.warning(error instanceof Error ? error.message : "云端重命名失败，本地已更新"));
    };

    return (
        <article data-selected={selected}
            className="group relative flex min-w-0 cursor-pointer flex-col overflow-hidden rounded-2xl border border-border bg-card transition-[border-color,box-shadow] hover:border-amber-600/45 hover:shadow-lg data-[selected=true]:border-amber-600/55"
            onClick={() => !editing && onOpen()}>
            <CanvasProjectPreview nodes={project.nodes} connections={project.connections} />
            <div className="absolute inset-x-3 top-3 flex min-h-6 items-center justify-between">
                <input
                    type="checkbox"
                    checked={selected}
                    onClick={(event) => event.stopPropagation()}
                    onChange={(event) => toggleSelected(project.id, event.target.checked)}
                    className="size-4 shrink-0 cursor-pointer accent-amber-700 dark:accent-(--canvas-accent)"
                    aria-label={`选择 ${project.title}`}
                />
                {project.localOnly && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-2 py-1 text-[10px] text-muted-foreground">
                        <HardDrive aria-hidden className="size-3" />
                        本地草稿
                    </span>
                )}
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-2.5 p-3.5">
                {editing ? (
                    <Input aria-label="画布名称" className="min-w-0" value={editingTitle} onClick={(event) => event.stopPropagation()}
                        onChange={(event) => setEditingTitle(event.target.value)} onPressEnter={saveTitle} autoFocus />
                ) : (
                    <button
                        type="button"
                        className="flex h-7 min-w-0 cursor-pointer items-center justify-between gap-2 rounded-sm text-left text-[15px] font-semibold"
                        onClick={(event) => {
                            event.stopPropagation();
                            onOpen();
                        }}
                    >
                        <span className="truncate" title={project.title}>{project.title}</span>
                        <ArrowUpRight aria-hidden className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-amber-700 dark:group-hover:text-[color:var(--canvas-accent)]" />
                    </button>
                )}
                <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground tabular-nums">
                    <span className="rounded-md border border-border bg-background px-2 py-1">{project.nodes.length} 节点</span>
                    <span className="rounded-md border border-border bg-background px-2 py-1">{project.connections.length} 连线</span>
                </div>
            </div>
            <div className="mx-3.5 flex flex-wrap items-center justify-between gap-2 border-t border-border py-2.5">
                <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground tabular-nums">
                    <Clock3 aria-hidden className="size-3.5" />
                    {hasUpdatedAt ? (
                        <time dateTime={updatedAt.toISOString()}><span className="sr-only">更新于 </span>{updatedAtFormat.format(updatedAt)}</time>
                    ) : "更新时间未知"}
                </span>
                <div className="flex items-center gap-1 rounded-lg border border-border bg-background p-0.5" onClick={(event) => event.stopPropagation()}>
                    {editing ? (
                        <>
                            <Tooltip title="保存名称"><Button type="text" size="small" icon={<Check aria-hidden className="size-4" />} onClick={saveTitle} aria-label="保存名称" /></Tooltip>
                            <Tooltip title="取消重命名"><Button type="text" size="small" icon={<X aria-hidden className="size-4" />} onClick={stopEditing} aria-label="取消重命名" /></Tooltip>
                        </>
                    ) : (
                        <>
                            <Tooltip title="导出"><Button type="text" size="small" icon={<Download aria-hidden className="size-4" />} onClick={onExport} aria-label="导出" /></Tooltip>
                            <Tooltip title="重命名"><Button type="text" size="small" icon={<Pencil aria-hidden className="size-4" />} onClick={() => startEditing(project.id, project.title)} aria-label="重命名" /></Tooltip>
                            <Tooltip title="删除"><Button danger type="text" size="small" icon={<Trash2 aria-hidden className="size-4" />} onClick={() => setDeleteIds([project.id])} aria-label="删除" /></Tooltip>
                        </>
                    )}
                </div>
            </div>
        </article>
    );
}
