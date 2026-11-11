import { memo, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { App, ConfigProvider, Dropdown, Input, Popconfirm, Segmented, Select, Tag } from "antd";
import { Check, ChevronDown, ChevronRight, Download, Eye, FileText, FolderOpen, Image as ImageIcon, Layers, ListChecks, Music2, Plus, Search, Settings2, Square, Trash2, Type, Video } from "canvas-lucide";
import { motion } from "motion/react";

import { PlatformAssetsBrowser } from "@canvas/components/assets/platform-assets-browser";
import { OSS_THUMB_WIDTH, OssThumbImage, OssVideoPoster, ossVideoPoster } from "@canvas/lib/platform/oss-image";
import { canvasNodeColor, canvasNodeStatus, canvasThemes, type CanvasTheme } from "@canvas/lib/canvas-theme";
import { loadVideoPosterUrl } from "@canvas/lib/canvas/canvas-video-frame";
import { getNodeDefinition, listNodeDefinitions, useNodeRegistryVersion } from "@canvas/lib/canvas/node-registry";
import { cn } from "@canvas/lib/utils";
import { uploadMediaFile } from "@canvas/services/file-storage";
import { useAssetStore, type Asset, type AssetKind } from "@canvas/stores/use-asset-store";
import { CANVAS_SIDE_PANEL_MAX_WIDTH, CANVAS_SIDE_PANEL_MIN_WIDTH, CANVAS_SIDE_PANEL_RAIL_WIDTH, useCanvasSidePanelStore } from "@canvas/stores/use-canvas-side-panel-store";
import { useThemeStore } from "@canvas/stores/use-theme-store";
import { CanvasNodeType, type CanvasNodeData, type CanvasNodeTypeId } from "@canvas/types/canvas";
import { useAssetImportCompliancePoll } from "@canvas/hooks/use-asset-import-compliance-poll";

import { setAssetDragData } from "@canvas/lib/canvas/canvas-asset-dnd";
import type { ImportComplianceMeta } from "@canvas/lib/canvas/canvas-import-compliance";
import { complianceBadgeLabel, prepareLocalImageAsset } from "@canvas/lib/canvas/prepare-local-image-asset";

import type { InsertAssetPayload } from "./asset-picker-modal";

type PanelTab = "canvas" | "assets";

type Props = {
    nodes: CanvasNodeData[];
    selectedNodeIds: Set<string>;
    onFocusNode: (nodeId: string) => void;
    onPreviewNode: (nodeId: string) => void;
    onAddNode: (type: CanvasNodeTypeId) => void;
    onInsertAsset: (payload: InsertAssetPayload) => void;
    onVideoPoster?: (nodeId: string, posterUrl: string, sourceUrl: string) => void;
};

const NODE_TYPE_ICON: Record<string, typeof Square> = {
    [CanvasNodeType.Image]: ImageIcon,
    [CanvasNodeType.Video]: Video,
    [CanvasNodeType.Audio]: Music2,
    [CanvasNodeType.Text]: Type,
    [CanvasNodeType.Config]: Settings2,
    [CanvasNodeType.Group]: Square,
};

export function CanvasSidePanel({ nodes, selectedNodeIds, onFocusNode, onPreviewNode, onAddNode, onInsertAsset, onVideoPoster }: Props) {
    const theme = canvasThemes[useThemeStore((state) => state.theme)];
    const [tab, setTab] = useState<PanelTab>("canvas");
    const width = useCanvasSidePanelStore((state) => state.width);
    const panelOpen = useCanvasSidePanelStore((state) => state.panelOpen);
    const setPanelOpen = useCanvasSidePanelStore((state) => state.setPanelOpen);
    const setWidth = useCanvasSidePanelStore((state) => state.setWidth);
    const [resizing, setResizing] = useState(false);
    useNodeRegistryVersion();

    const startResize = (event: ReactPointerEvent<HTMLButtonElement>) => {
        event.preventDefault();
        const startX = event.clientX;
        const startWidth = event.currentTarget.parentElement?.clientWidth ?? width;
        let nextWidth = startWidth;
        const onMove = (moveEvent: PointerEvent) => {
            nextWidth = Math.min(CANVAS_SIDE_PANEL_MAX_WIDTH, Math.max(CANVAS_SIDE_PANEL_MIN_WIDTH, startWidth + startX - moveEvent.clientX));
            setWidth(nextWidth);
        };
        const onUp = () => {
            localStorage.setItem("canvas-side-panel-width", String(nextWidth));
            window.removeEventListener("pointermove", onMove);
            window.removeEventListener("pointerup", onUp);
            setResizing(false);
        };
        setResizing(true);
        window.addEventListener("pointermove", onMove);
        window.addEventListener("pointerup", onUp);
    };

    const selectTab = (nextTab: PanelTab) => {
        setTab(nextTab);
        if (!panelOpen) setPanelOpen(true);
    };
    const expandedWidth = `min(${width + 1}px, calc(100vw - 96px))`;
    const panelWidth = panelOpen ? expandedWidth : `${CANVAS_SIDE_PANEL_RAIL_WIDTH}px`;
    const toggleLabel = panelOpen ? "收起面板" : "展开面板";

    return (
        <aside
            aria-label="画布右侧面板"
            className={cn("relative z-[60] h-full shrink-0 overflow-hidden border-l",
                !resizing && "transition-[width] duration-300 ease-out motion-reduce:transition-none")}
            style={{ width: panelWidth, background: theme.toolbar.panel, borderColor: theme.toolbar.border, color: theme.node.text }}
            data-canvas-no-zoom
        >
            <div className="absolute inset-y-0 right-0 flex flex-col" style={{ width: `calc(${panelWidth} - 1px)` }}>
                <div className={cn("flex items-center gap-2 border-b", panelOpen ? "flex-row-reverse px-3 py-3" : "flex-col px-1.5 py-2")} style={{ borderColor: theme.toolbar.border }}>
                    <button type="button" className={cn("grid shrink-0 place-items-center rounded-lg border hover:bg-white/10", panelOpen ? "size-7" : "size-8")}
                        style={{ color: theme.node.muted, borderColor: theme.toolbar.border }}
                        onClick={() => setPanelOpen(!panelOpen)} aria-expanded={panelOpen} aria-controls="canvas-side-panel-content" aria-label={toggleLabel} title={toggleLabel}>
                        <ChevronRight aria-hidden className={cn("size-3.5", !panelOpen && "rotate-180")} />
                    </button>
                    <div role="group" aria-label="画布侧栏"
                        className={cn("flex gap-1", panelOpen ? "min-w-0 flex-1 rounded-xl border p-1" : "flex-col")}
                        style={panelOpen ? { borderColor: theme.toolbar.border, background: theme.toolbar.itemHover } : undefined}>
                        <TabButton label="元素" icon={Layers} active={tab === "canvas"} compact={!panelOpen} theme={theme} onClick={() => selectTab("canvas")} />
                        <TabButton label="资产" icon={ImageIcon} active={tab === "assets"} compact={!panelOpen} theme={theme} onClick={() => selectTab("assets")} />
                    </div>
                </div>
                <div id="canvas-side-panel-content" className={panelOpen ? "flex min-h-0 flex-1 flex-col" : "hidden"}>
                    {panelOpen && (
                        <>
                            <div className="min-h-0 flex-1 overflow-hidden">
                                {tab === "canvas" ? (
                                    <CanvasNodesTab nodes={nodes} selectedNodeIds={selectedNodeIds} onFocusNode={onFocusNode} onPreviewNode={onPreviewNode} onVideoPoster={onVideoPoster} theme={theme} />
                                ) : (
                                    <ConfigProvider theme={{ components: { Segmented: {
                                        trackBg: theme.node.fill,
                                        itemColor: theme.node.muted,
                                        itemSelectedBg: theme.toolbar.activeBg,
                                        itemSelectedColor: theme.toolbar.activeText,
                                    } } }}>
                                        <CanvasAssetsTab onInsert={onInsertAsset} theme={theme} />
                                    </ConfigProvider>
                                )}
                            </div>
                            {tab === "canvas" && (
                                <div className="shrink-0 border-t p-2.5" style={{ borderColor: theme.toolbar.border }}>
                                    <Dropdown trigger={["click"]} placement="topLeft" menu={{
                                        items: listNodeDefinitions().filter((item) => item.showInCreateMenu !== false).map((item) => ({
                                            key: item.type, label: item.title, icon: item.icon,
                                            onClick: () => onAddNode(item.type),
                                        })),
                                    }}>
                                        <button type="button" className="flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border text-xs font-semibold hover:brightness-125"
                                            style={{ color: theme.toolbar.activeText, background: theme.toolbar.activeBg, borderColor: `color-mix(in srgb, ${theme.toolbar.activeText} 24%, transparent)` }}>
                                            <Plus className="size-3.5" />添加节点<ChevronDown className="size-3" />
                                        </button>
                                    </Dropdown>
                                </div>
                            )}
                        </>
                    )}
                </div>
                {panelOpen && <button type="button" className="absolute inset-y-0 left-0 z-40 w-2 cursor-col-resize" onPointerDown={startResize} aria-label="调整右侧面板宽度" />}
            </div>
        </aside>
    );
}

function TabButton({ label, icon: Icon, active, compact, theme, onClick }: { label: string; icon: typeof Square; active: boolean; compact: boolean; theme: CanvasTheme; onClick: () => void }) {
    return (
        <button type="button" aria-pressed={active} onClick={onClick} title={compact ? label : undefined}
            className={cn("relative flex h-8 items-center justify-center gap-1.5 rounded-lg text-xs font-semibold transition hover:brightness-125",
                compact ? "w-8" : "min-w-0 flex-1")}
            style={{ color: active ? theme.toolbar.activeText : theme.node.muted }}>
            {active && <motion.span aria-hidden layoutId="sidePanelTabIndicator" className="absolute inset-0 rounded-[inherit]"
                style={{ background: theme.toolbar.activeBg }} transition={{ duration: 0.18 }} />}
            <Icon className="relative size-3.5" aria-hidden />
            <span className={compact ? "sr-only" : "relative"}>{label}</span>
        </button>
    );
}

// ---------------------------------------------------------------------------
// 画布 Tab —— 列出节点,点击居中放大并选中
// ---------------------------------------------------------------------------

const NODE_FILTER_OPTIONS = [
    { label: "全部", value: "all" },
    { label: "图片", value: CanvasNodeType.Image },
    { label: "视频", value: CanvasNodeType.Video },
    { label: "文本", value: CanvasNodeType.Text },
    { label: "音频", value: CanvasNodeType.Audio },
    { label: "配置", value: CanvasNodeType.Config },
    { label: "分组", value: CanvasNodeType.Group },
];

function CanvasNodesTab({ nodes, selectedNodeIds, onFocusNode, onPreviewNode, onVideoPoster, theme }: { nodes: CanvasNodeData[]; selectedNodeIds: Set<string>; onFocusNode: (nodeId: string) => void; onPreviewNode: (nodeId: string) => void; onVideoPoster?: (nodeId: string, posterUrl: string, sourceUrl: string) => void; theme: CanvasTheme }) {
    const { message } = App.useApp();
    const [keyword, setKeyword] = useState("");
    const [typeFilter, setTypeFilter] = useState<string>("all");
    const [selectMode, setSelectMode] = useState(false);
    const [checked, setChecked] = useState<Set<string>>(new Set());
    const [exporting, setExporting] = useState(false);

    const filtered = useMemo(() => {
        const query = keyword.trim().toLowerCase();
        return nodes.filter((node) => (typeFilter === "all" || node.type === typeFilter) && (!query || [node.title, node.metadata?.content, node.metadata?.prompt].filter(Boolean).join(" ").toLowerCase().includes(query)));
    }, [nodes, keyword, typeFilter]);

    const exitSelect = () => {
        setSelectMode(false);
        setChecked(new Set());
    };
    const toggleChecked = (id: string) =>
        setChecked((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    const allChecked = filtered.length > 0 && filtered.every((node) => checked.has(node.id));
    const toggleAll = () => setChecked(allChecked ? new Set() : new Set(filtered.map((node) => node.id)));
    const scrollRef = useRef<HTMLDivElement>(null);
    const [scrollTop, setScrollTop] = useState(0);
    const [viewportHeight, setViewportHeight] = useState(480);
    const rowHeight = 46;

    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;
        const sync = () => setViewportHeight(el.clientHeight);
        sync();
        const observer = new ResizeObserver(sync);
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        scrollRef.current?.scrollTo({ top: 0 });
        setScrollTop(0);
    }, [keyword, typeFilter]);

    const start = Math.max(0, Math.floor(scrollTop / rowHeight) - 6);
    const end = Math.min(filtered.length, Math.ceil((scrollTop + viewportHeight) / rowHeight) + 6);
    const windowed = filtered.slice(start, end);
    const pendingPosterKey = windowed
        .flatMap((node) => {
            if (node.type !== CanvasNodeType.Video || node.metadata?.posterUrl) return [];
            const content = node.metadata?.content || "";
            if (!/^https?:\/\//i.test(content) || ossVideoPoster(content, OSS_THUMB_WIDTH)) return [];
            return [`${node.id}\t${node.metadata?.storageKey || ""}\t${content}`];
        })
        .join("\n");

    useEffect(() => {
        if (!onVideoPoster || !pendingPosterKey) return;
        for (const item of pendingPosterKey.split("\n")) {
            const [nodeId, storageKey, ...rest] = item.split("\t");
            const content = rest.join("\t");
            if (!nodeId || !content) continue;
            void loadVideoPosterUrl(content, storageKey || undefined)
                .then((posterUrl) => {
                    if (posterUrl) onVideoPoster(nodeId, posterUrl, content);
                })
                .catch(() => undefined);
        }
    }, [onVideoPoster, pendingPosterKey]);

    const handleExport = async () => {
        const targets = nodes.filter((node) => checked.has(node.id));
        if (!targets.length) return;
        setExporting(true);
        const hide = message.loading("正在导出选中元素…", 0);
        try {
            const { exportCanvasNodes } = await import("@canvas/lib/canvas/canvas-export");
            await exportCanvasNodes(targets, `画布元素-${targets.length}个`);
            message.success(`已导出 ${targets.length} 个元素`);
            exitSelect();
        } catch (error) {
            console.error(error);
            message.error("导出失败，请重试");
        } finally {
            hide();
            setExporting(false);
        }
    };

    return (
        <div className="flex h-full flex-col">
            <div className="px-3 pt-3">
                <Input className="!h-8 !rounded-lg" allowClear prefix={<Search className="mr-1 size-3.5" />} aria-label="搜索节点" placeholder="搜索节点…" value={keyword} onChange={(e) => setKeyword(e.target.value)} />
            </div>
            <div className="flex items-center gap-1.5 px-3 py-2">
                <span className="min-w-0 truncate text-[11px]" style={{ color: theme.node.muted }}>{filtered.length} 个元素</span>
                <button
                    type="button"
                    onClick={() => (selectMode ? exitSelect() : setSelectMode(true))}
                    aria-pressed={selectMode}
                    className="ml-auto flex h-7 shrink-0 items-center gap-1 rounded-md border px-1.5 text-[11px] font-medium transition hover:bg-black/5 dark:hover:bg-white/10"
                    style={{ borderColor: theme.toolbar.border, color: selectMode ? theme.toolbar.activeText : theme.node.muted, background: selectMode ? theme.toolbar.activeBg : undefined }}
                >
                    <ListChecks className="size-3.5" />
                    {selectMode ? "取消" : "选择"}
                </button>
                {selectMode ? null : <Select size="small" aria-label="筛选节点类型" className="!h-7 w-[68px] shrink-0" value={typeFilter} onChange={setTypeFilter} options={NODE_FILTER_OPTIONS} />}
            </div>
            <div ref={scrollRef} className="thin-scrollbar min-h-0 flex-1 overflow-y-auto px-3 pb-3" onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}>
                {filtered.length ? (
                    <div className="relative" style={{ height: filtered.length * rowHeight }}>
                        <div className="absolute inset-x-0 grid grid-cols-1 gap-1" style={{ top: start * rowHeight }}>
                            {windowed.map((node) => {
                                const Icon = NODE_TYPE_ICON[node.type] || FileText;
                                const accent = canvasNodeColor(node.type, theme.node.muted);
                                const isImage = node.type === CanvasNodeType.Image && node.metadata?.content;
                                const thumb = isImage ? node.metadata?.content : node.type === CanvasNodeType.Video ? node.metadata?.posterUrl || ossVideoPoster(node.metadata?.content, OSS_THUMB_WIDTH) : "";
                                const isChecked = checked.has(node.id);
                                const active = selectMode ? isChecked : selectedNodeIds.has(node.id);
                                const status = node.metadata?.status && node.metadata.status !== "idle" ? canvasNodeStatus[node.metadata.status] : undefined;
                                const title = node.title || getNodeDefinition(node.type)?.title || "未命名节点";
                                return (
                                    <div key={node.id} className={cn("group flex w-full items-center rounded-lg border transition", !active && "hover:bg-black/5 dark:hover:bg-white/5")}
                                        style={{ height: rowHeight - 4, borderColor: active ? `color-mix(in srgb, ${theme.toolbar.activeText} 30%, transparent)` : theme.toolbar.border, backgroundColor: active ? theme.toolbar.activeBg : undefined }}>
                                        <button type="button" onClick={() => (selectMode ? toggleChecked(node.id) : onFocusNode(node.id))} aria-pressed={active}
                                            className="flex h-full min-w-0 flex-1 items-center gap-2 rounded-[inherit] px-2 text-left" title={selectMode ? undefined : "定位到节点"}>
                                            {selectMode ? <CheckMark checked={isChecked} theme={theme} /> : null}
                                            <span className="grid size-7 shrink-0 place-items-center overflow-hidden rounded-lg border" style={{ color: accent, borderColor: `color-mix(in srgb, ${accent} 24%, transparent)`, background: `color-mix(in srgb, ${accent} 12%, transparent)` }}>
                                                {thumb ? <OssThumbImage src={thumb} maxWidth={OSS_THUMB_WIDTH} alt="" loading="lazy" className="size-full object-cover" /> : <Icon className="size-3.5" aria-hidden />}
                                            </span>
                                            <span className="min-w-0 flex-1 truncate text-xs font-medium leading-snug" title={title}>{title}</span>
                                            {status && <span title={status.label} aria-label={status.label} role="img" className="size-1.5 shrink-0 rounded-full" style={{ background: status.color }} />}
                                        </button>
                                        {selectMode || !isImage ? null : (
                                            <div className="flex shrink-0 flex-col items-center gap-0.5 pr-1.5">
                                                <button type="button" onClick={() => onPreviewNode(node.id)} className="grid size-7 place-items-center rounded-md opacity-55 transition hover:bg-black/10 hover:opacity-100 dark:hover:bg-white/10" aria-label="放大预览" title="放大预览">
                                                    <Eye className="size-3.5" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    <SidebarEmpty icon={Layers} title={nodes.length ? "没有匹配的节点" : "画布暂无节点"}
                        description={nodes.length ? "试试其他关键词或类型" : "点击底部的添加节点开始创作"} theme={theme} />
                )}
            </div>
            {selectMode ? (
                <div className="flex items-center gap-2 border-t px-3 py-2.5" style={{ borderColor: theme.toolbar.border }}>
                    <button type="button" onClick={toggleAll} className="rounded-md px-2 py-1 text-xs font-medium opacity-70 transition hover:bg-black/5 hover:opacity-100 dark:hover:bg-white/10">
                        {allChecked ? "取消全选" : "全选"}
                    </button>
                    <span className="text-xs opacity-45">已选 {checked.size}</span>
                    <button
                        type="button"
                        onClick={() => void handleExport()}
                        disabled={!checked.size || exporting}
                        className="ml-auto flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-white/10"
                        style={{ color: theme.node.text }}
                    >
                        <Download className="size-3.5" />
                        导出选中
                    </button>
                </div>
            ) : null}
        </div>
    );
}

function SidebarEmpty({ icon: Icon, title, description, theme }: { icon: typeof Layers; title: string; description: string; theme: CanvasTheme }) {
    return (
        <div className="mx-3 mt-5 grid justify-items-center gap-2 rounded-xl border border-dashed px-3 py-6 text-center" style={{ borderColor: theme.toolbar.border, background: theme.toolbar.itemHover }}>
            <span className="grid size-9 place-items-center rounded-xl" style={{ background: theme.toolbar.activeBg, color: theme.toolbar.activeText }}><Icon className="size-4" aria-hidden /></span>
            <p className="text-xs font-medium">{title}</p>
            <p className="text-[11px]" style={{ color: theme.node.muted }}>{description}</p>
        </div>
    );
}

function CheckMark({ checked, theme }: { checked: boolean; theme: CanvasTheme }) {
    return (
        <span className="grid size-4 shrink-0 place-items-center rounded border transition" style={{ borderColor: checked ? theme.toolbar.activeText : theme.node.stroke, background: checked ? theme.toolbar.activeText : "transparent" }}>
            {checked ? <Check className="size-3 text-white" /> : null}
        </span>
    );
}

// ---------------------------------------------------------------------------
// 资产 Tab —— 按类型折叠分组 + 标签筛选,点击插入画布
// ---------------------------------------------------------------------------

const ASSET_GROUPS: { kind: AssetKind; label: string; icon: typeof Square }[] = [
    { kind: "image", label: "图片", icon: ImageIcon },
    { kind: "video", label: "视频", icon: Video },
    { kind: "text", label: "文本", icon: FileText },
];

function buildInsertPayload(asset: Asset): InsertAssetPayload {
    if (asset.kind === "text") return { kind: "text", content: asset.data.content, title: asset.title };
    if (asset.kind === "video") return { kind: "video", url: asset.data.url, storageKey: asset.data.storageKey, title: asset.title, width: asset.data.width, height: asset.data.height };
    const compliance = readAssetCompliance(asset);
    return { kind: "image", dataUrl: asset.data.dataUrl, storageKey: asset.data.storageKey, title: asset.title, compliance: compliance || undefined };
}

function readAssetCompliance(asset: Asset): ImportComplianceMeta | null {
    const m = asset.metadata;
    if (!m || m.complianceSource !== "import") return null;
    const status = m.complianceStatus;
    if (status !== "PROCESSING" && status !== "ACTIVE" && status !== "FAILED") return null;
    return {
        complianceSource: "import",
        complianceStatus: status,
        complianceAssetId: typeof m.complianceAssetId === "number" ? m.complianceAssetId : undefined,
        arkAssetId: typeof m.arkAssetId === "string" ? m.arkAssetId : undefined,
        complianceSupplierId: typeof m.complianceSupplierId === "number" ? m.complianceSupplierId : undefined,
        complianceError: typeof m.complianceError === "string" ? m.complianceError : undefined,
    };
}

const CanvasAssetsTab = memo(function CanvasAssetsTab({ onInsert, theme }: { onInsert: (payload: InsertAssetPayload) => void; theme: CanvasTheme }) {
    const { message } = App.useApp();
    const assets = useAssetStore((state) => state.assets);
    const addAsset = useAssetStore((state) => state.addAsset);
    const removeAsset = useAssetStore((state) => state.removeAsset);
    useAssetImportCompliancePoll(true);
    const [source, setSource] = useState<"local" | "platform">("local");
    const [keyword, setKeyword] = useState("");
    const [tagFilter, setTagFilter] = useState<string>("all");
    const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const allTags = useMemo(() => Array.from(new Set(assets.flatMap((asset) => asset.tags || []))).slice(0, 20), [assets]);

    const filtered = useMemo(() => {
        const query = keyword.trim().toLowerCase();
        return assets.filter((asset) => (tagFilter === "all" || (asset.tags || []).includes(tagFilter)) && (!query || [asset.title, ...(asset.tags || [])].join(" ").toLowerCase().includes(query)));
    }, [assets, keyword, tagFilter]);

    const groups = useMemo(() => ASSET_GROUPS.map((group) => ({ ...group, items: filtered.filter((asset) => asset.kind === group.kind) })).filter((group) => group.items.length > 0), [filtered]);

    const handleFiles = async (fileList: FileList | null) => {
        const files = Array.from(fileList || []);
        if (!files.length) return;
        setUploading(true);
        const hide = message.loading("正在添加资产…", 0);
        let added = 0;
        try {
            for (const file of files) {
                if (file.type.startsWith("image/")) {
                    const prepared = await prepareLocalImageAsset(file);
                    addAsset({
                        kind: "image",
                        title: file.name || "图片",
                        coverUrl: prepared.dataUrl,
                        tags: [],
                        data: {
                            dataUrl: prepared.dataUrl,
                            storageKey: prepared.storageKey,
                            width: prepared.width,
                            height: prepared.height,
                            bytes: prepared.bytes,
                            mimeType: prepared.mimeType,
                        },
                        metadata: prepared.compliance || {},
                    });
                    added += 1;
                } else if (file.type.startsWith("video/")) {
                    const media = await uploadMediaFile(file, "video");
                    addAsset({ kind: "video", title: file.name || "视频", coverUrl: "", tags: [], data: { url: media.url, storageKey: media.storageKey, width: media.width || 0, height: media.height || 0, bytes: media.bytes, mimeType: media.mimeType } });
                    added += 1;
                }
            }
            if (added) message.success(`已添加 ${added} 个资产`);
            else message.warning("仅支持图片或视频文件");
        } catch (error) {
            console.error(error);
            message.error("添加失败，请重试");
        } finally {
            hide();
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    return (
        <div className="flex h-full flex-col">
            <div className="px-3 pb-2 pt-3">
                <Segmented
                    block
                    className="!rounded-lg !p-1"
                    aria-label="资产来源"
                    value={source}
                    onChange={(v) => setSource(v as "local" | "platform")}
                    options={[
                        { label: "本地", value: "local" },
                        { label: "平台", value: "platform" },
                    ]}
                />
            </div>
            {source === "platform" ? (
                <div className="thin-scrollbar min-h-0 flex-1 overflow-y-auto px-3 pb-3">
                    <PlatformAssetsBrowser compact onInsert={onInsert} />
                </div>
            ) : (
                <>
                    <div className="flex items-center gap-2 px-3 pb-2.5">
                        <Input className="!h-8 !rounded-lg" allowClear prefix={<Search className="mr-1 size-3.5" />} aria-label="搜索本地资产" placeholder="搜索资产…" value={keyword} onChange={(e) => setKeyword(e.target.value)} />
                        <button
                            type="button"
                            disabled={uploading}
                            onClick={() => fileInputRef.current?.click()}
                            className="flex h-8 shrink-0 items-center gap-1 rounded-lg border px-2 text-xs font-semibold transition hover:brightness-125 disabled:cursor-not-allowed disabled:opacity-50"
                            style={{ color: theme.toolbar.activeText, background: theme.toolbar.activeBg, borderColor: theme.toolbar.border }}
                        >
                            <Plus className="size-3.5" />
                            添加
                        </button>
                        <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={(e) => void handleFiles(e.target.files)} />
                    </div>
                    {allTags.length ? (
                        <div className="flex flex-wrap gap-1.5 px-3 pb-2">
                            <Tag.CheckableTag checked={tagFilter === "all"} className={cn("prompt-filter-tag", tagFilter === "all" && "is-active")} onChange={() => setTagFilter("all")}>
                                全部
                            </Tag.CheckableTag>
                            {allTags.map((tag) => (
                                <Tag.CheckableTag key={tag} checked={tagFilter === tag} className={cn("prompt-filter-tag", tagFilter === tag && "is-active")} onChange={() => setTagFilter((prev) => (prev === tag ? "all" : tag))}>
                                    {tag}
                                </Tag.CheckableTag>
                            ))}
                        </div>
                    ) : null}
                    <div className="thin-scrollbar min-h-0 flex-1 overflow-y-auto px-3 pb-3">
                        {groups.length ? (
                            <div className="space-y-2">
                                {groups.map((group) => {
                                    const isCollapsed = collapsed[group.kind];
                                    return (
                                        <div key={group.kind}>
                                            <button
                                                type="button"
                                                onClick={() => setCollapsed((prev) => ({ ...prev, [group.kind]: !prev[group.kind] }))}
                                                aria-expanded={!isCollapsed}
                                                className="flex w-full items-center gap-1.5 rounded-lg border px-2 py-2 text-left text-xs font-semibold transition hover:brightness-125"
                                                style={{ background: theme.toolbar.itemHover, borderColor: theme.toolbar.border }}
                                            >
                                                <ChevronRight className={cn("size-3.5 transition-transform", !isCollapsed && "rotate-90")} />
                                                <group.icon className="size-3.5" />
                                                <span>{group.label}</span>
                                                <span className="ml-auto rounded-full px-1.5 text-[10px]" style={{ color: theme.node.muted, background: theme.node.fill }}>{group.items.length}</span>
                                            </button>
                                            {isCollapsed ? null : (
                                                <div className="grid grid-cols-2 gap-2 pt-2">
                                                    {group.items.map((asset) => (
                                                        <AssetCard key={asset.id} asset={asset} theme={theme} onInsert={() => onInsert(buildInsertPayload(asset))} onRemove={() => (removeAsset(asset.id), message.success("资产已移除"))} />
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <SidebarEmpty icon={FolderOpen} title={assets.length ? "没有匹配的资产" : "暂无本地资产"}
                                description={assets.length ? "试试其他关键词或标签" : "上传图片或视频后可拖入画布"} theme={theme} />
                        )}
                    </div>
                </>
            )}
        </div>
    );
});

function AssetCard({ asset, theme, onInsert, onRemove }: { asset: Asset; theme: CanvasTheme; onInsert: () => void; onRemove: () => void }) {
    const badge = asset.kind === "image" ? complianceBadgeLabel(typeof asset.metadata?.complianceStatus === "string" ? asset.metadata.complianceStatus : undefined) : null;
    return (
        <div
            draggable
            onDragStart={(event) => setAssetDragData(event.dataTransfer, buildInsertPayload(asset))}
            title="拖到画布或点击加号插入"
            className="group cursor-grab overflow-hidden rounded-xl border transition duration-200 hover:shadow-lg active:cursor-grabbing"
            style={{ borderColor: theme.node.stroke, background: theme.node.panel }}
        >
            <div className="relative aspect-[4/3] overflow-hidden" style={{ background: theme.node.fill }}>
            <AssetCover asset={asset} />
            {badge ? (
                <span className="absolute left-1 top-1 max-w-[calc(100%-8px)] truncate rounded px-1.5 py-0.5 text-[10px] font-medium text-white" style={{ background: "rgba(0,0,0,.55)" }} title={typeof asset.metadata?.complianceError === "string" ? asset.metadata.complianceError : badge}>
                    {badge}
                </span>
            ) : null}
            <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 transition duration-200 group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100">
                <button
                    type="button"
                    onClick={onInsert}
                    onPointerDown={(event) => event.stopPropagation()}
                    className="grid size-8 place-items-center rounded-full bg-white/90 text-stone-700 shadow-sm backdrop-blur transition hover:bg-white hover:text-stone-900 dark:bg-black/60 dark:text-stone-100 dark:hover:bg-black/80"
                    aria-label="插入画布"
                >
                    <Plus className="size-4" />
                </button>
                <Popconfirm title="移除该资产?" okText="移除" cancelText="取消" okButtonProps={{ danger: true }} onConfirm={onRemove}>
                    <button
                        type="button"
                        onPointerDown={(event) => event.stopPropagation()}
                        className="grid size-8 place-items-center rounded-full bg-white/90 text-stone-700 shadow-sm backdrop-blur transition hover:bg-white hover:text-red-500 dark:bg-black/60 dark:text-stone-100 dark:hover:bg-black/80 dark:hover:text-red-400"
                        aria-label="移除资产"
                    >
                        <Trash2 className="size-4" />
                    </button>
                </Popconfirm>
            </div>
            </div>
            <div className="truncate border-t px-2 py-1.5 text-[11px] font-medium" style={{ borderColor: theme.toolbar.border }} title={asset.title}>{asset.title}</div>
        </div>
    );
}

function AssetCover({ asset }: { asset: Asset }) {
    if (asset.kind === "text") return <div className="size-full overflow-hidden whitespace-pre-wrap break-words p-2.5 text-[11px] leading-snug opacity-80">{asset.data.content}</div>;
    if (asset.kind === "video") {
        if (asset.coverUrl) return <OssThumbImage src={asset.coverUrl} maxWidth={480} alt="" className="size-full object-cover transition duration-300 group-hover:scale-[1.04]" />;
        return <OssVideoPoster url={asset.data.url} maxWidth={480} className="size-full object-cover" fallback={<Video className="size-5 opacity-60" />} />;
    }
    return <OssThumbImage src={asset.coverUrl || asset.data.dataUrl} maxWidth={480} alt="" className="size-full object-cover transition duration-300 group-hover:scale-[1.04]" />;
}
