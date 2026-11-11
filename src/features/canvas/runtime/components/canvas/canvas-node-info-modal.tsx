import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Button, Modal, Segmented } from "antd";
import { Braces, Copy, Info, TriangleAlert } from "canvas-lucide";

import { useCopyText } from "@canvas/hooks/use-copy-text";
import { canvasNodeColor, canvasNodeStatus, canvasThemes } from "@canvas/lib/canvas-theme";
import { getNodeDefinition } from "@canvas/lib/canvas/node-registry";
import { formatBytes, getDataUrlByteSize } from "@canvas/lib/image-utils";
import { useThemeStore } from "@canvas/stores/use-theme-store";
import { CanvasNodeType, type CanvasNodeData } from "@canvas/types/canvas";

const jsonToken = /("(?:\\.|[^"\\])*")(?=\s*:)|("(?:\\.|[^"\\])*")|(-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?)|\b(true|false|null)\b/g;

function highlightJson(json: string) {
    if (json.length > 100_000) return json;
    const fragments: ReactNode[] = [];
    let offset = 0;
    for (const token of json.matchAll(jsonToken)) {
        const start = token.index ?? offset;
        if (start > offset) fragments.push(json.slice(offset, start));
        let color = "text-violet-700 dark:text-violet-300";
        if (token[1]) color = "text-amber-800 dark:text-orange-300";
        else if (token[2]) color = "text-emerald-800 dark:text-emerald-300";
        else if (token[3]) color = "text-sky-800 dark:text-sky-300";
        fragments.push(<span key={start} className={color}>{token[0]}</span>);
        offset = start + token[0].length;
    }
    if (offset < json.length) fragments.push(json.slice(offset));
    return fragments;
}

export function CanvasNodeInfoModal({ node, open, onClose }: { node: CanvasNodeData | null; open: boolean; onClose: () => void }) {
    const mode = useThemeStore((state) => state.theme);
    const theme = canvasThemes[mode];
    const [view, setView] = useState<"info" | "json">("info");
    const copyText = useCopyText();
    const json = useMemo(() => {
        if (!open || !node || view !== "json") return "";
        return JSON.stringify(node, (key, value: unknown) => {
            if (key === "content" && typeof value === "string" && value.startsWith("data:image/")) return "[base64 image]";
            return value;
        }, 2);
    }, [node, open, view]);
    const highlighted = useMemo(() => highlightJson(json), [json]);

    useEffect(() => {
        if (open) setView("info");
    }, [node?.id, open]);

    const type = node && getNodeDefinition(node.type);
    const title = node?.title || "未命名节点";
    const accent = node ? canvasNodeColor(node.type, theme.toolbar.activeText) : theme.toolbar.activeText;
    const rawStatus = node?.metadata?.status;
    const status = rawStatus && rawStatus !== "idle" ? canvasNodeStatus[rawStatus] : undefined;
    const imageBytes = node?.type === CanvasNodeType.Image && node.metadata?.content ? getDataUrlByteSize(node.metadata.content) : 0;
    const batchCount = node?.metadata?.batchChildIds?.length ?? 0;
    const tileStyle = { background: theme.node.panel, borderColor: theme.toolbar.border };

    return (
        <Modal title={<span className="flex items-center gap-2"><Info aria-hidden className="size-4" style={{ color: theme.toolbar.activeText }} />节点信息</span>}
            open={open && Boolean(node)} centered width={640} footer={null} onCancel={onClose} destroyOnHidden>
            {node && <div className="flex max-h-[calc(100dvh-140px)] min-h-0 flex-col gap-3 select-text" data-canvas-shortcuts-ignore>
                <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                        <span className="grid size-8 shrink-0 place-items-center rounded-lg border [&>svg]:size-4"
                            style={{ color: accent, borderColor: accent + "40", background: accent + "15" }} aria-hidden>{type?.icon ?? <Info />}</span>
                        <span className="min-w-0 truncate text-sm font-semibold" title={title}>{title}</span>
                        <span className="shrink-0 rounded-full border px-2 py-0.5 text-[11px]"
                            style={{ color: status?.color ?? theme.node.muted, borderColor: theme.toolbar.border }}>{status?.label ?? "空闲"}</span>
                    </div>
                    <Segmented size="small" aria-label="查看节点数据" value={view} onChange={setView}
                        options={[{ label: "信息", value: "info" }, { label: "JSON", value: "json" }]} />
                </div>
                {view === "info" ? (
                    <div className="thin-scrollbar min-h-0 overflow-y-auto pr-0.5">
                        <dl className="!m-0 grid grid-cols-2 gap-2 sm:grid-cols-3">
                            <InfoTile label="节点 ID" value={node.id} className="col-span-2 sm:col-span-3" style={tileStyle} />
                            <InfoTile label="类型" value={type?.title ?? node.type} style={tileStyle} />
                            <InfoTile label="尺寸" value={`${Math.round(node.width)} × ${Math.round(node.height)} px`} style={tileStyle} />
                            <InfoTile label="位置" value={`X ${Math.round(node.position.x)} · Y ${Math.round(node.position.y)}`} style={tileStyle} />
                            {batchCount > 1 && <InfoTile label="图片组" value={`${batchCount} 张`} style={tileStyle} />}
                            {imageBytes > 0 && <InfoTile label="图片大小" value={formatBytes(imageBytes)} style={tileStyle} />}
                            {node.metadata?.prompt && <InfoTile label="提示词" value={node.metadata.prompt} className="col-span-2 sm:col-span-3" style={tileStyle} />}
                        </dl>
                        {node.metadata?.errorDetails && (
                            <section className="mt-3 rounded-lg border p-3 text-xs" style={{ borderColor: canvasNodeStatus.error.color + "40", background: canvasNodeStatus.error.color + "10" }}>
                                <strong className="flex items-center gap-1.5" style={{ color: canvasNodeStatus.error.color }}><TriangleAlert aria-hidden className="size-3.5" />错误详情</strong>
                                <div className="mt-1 whitespace-pre-wrap [overflow-wrap:anywhere]">{node.metadata.errorDetails}</div>
                            </section>
                        )}
                    </div>
                ) : (
                    <section className="flex min-h-0 flex-col overflow-hidden rounded-xl border" style={tileStyle}>
                        <div className="flex shrink-0 items-center justify-between gap-2 border-b px-3 py-2" style={{ borderColor: theme.toolbar.border }}>
                            <span className="flex items-center gap-1.5 text-xs" style={{ color: theme.node.muted }}><Braces aria-hidden className="size-3.5" />节点数据</span>
                            <Button size="small" icon={<Copy className="size-3.5" />} onClick={() => copyText(json, "已复制节点 JSON")}>复制 JSON</Button>
                        </div>
                        <pre aria-label="节点 JSON" tabIndex={0}
                            className="thin-scrollbar !m-0 max-h-[min(52dvh,440px)] min-h-0 overflow-y-auto whitespace-pre-wrap p-3 font-mono text-xs leading-6 [overflow-wrap:anywhere]"
                            style={{ color: theme.node.text }}>{highlighted}</pre>
                    </section>
                )}
            </div>}
        </Modal>
    );
}

function InfoTile({ label, value, className = "", style }: { label: string; value: string; className?: string; style: React.CSSProperties }) {
    return (
        <div className={`min-w-0 rounded-lg border p-2.5 ${className}`} style={style}>
            <dt className="text-[11px] opacity-70">{label}</dt>
            <dd className="!m-0 mt-0.5 whitespace-pre-wrap text-xs font-medium [overflow-wrap:anywhere]">{value}</dd>
        </div>
    );
}
