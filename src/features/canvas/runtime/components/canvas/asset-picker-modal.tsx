import { useEffect, useMemo, useState } from "react";
import { Empty, Input, Modal, Pagination, Segmented, Tag } from "antd";
import { Search } from "canvas-lucide";

import { PlatformAssetsBrowser } from "@canvas/components/assets/platform-assets-browser";
import type { ImportComplianceMeta } from "@canvas/lib/canvas/canvas-import-compliance";
import { OssThumbImage } from "@canvas/lib/platform/oss-image";
import { cn } from "@canvas/lib/utils";
import { useAssetStore, type Asset } from "@canvas/stores/use-asset-store";

export type InsertAssetPayload =
    | { kind: "text"; content: string; title: string }
    | { kind: "image"; dataUrl: string; title: string; storageKey?: string; compliance?: ImportComplianceMeta }
    | { kind: "video"; url: string; title: string; storageKey?: string; width?: number; height?: number }
    | { kind: "audio"; url: string; title: string; storageKey?: string };

type Props = {
    open: boolean;
    defaultTab?: string;
    onInsert: (payload: InsertAssetPayload) => void;
    onClose: () => void;
};

export function AssetPickerModal({ open, onInsert, onClose }: Props) {
    const [source, setSource] = useState<"local" | "platform">("local");

    return (
        <Modal title="选择资产" open={open} onCancel={onClose} footer={null} width={860} destroyOnHidden styles={{ body: { padding: "0 24px 24px", minHeight: 480 } }}>
            <div className="mb-4">
                <Segmented
                    value={source}
                    onChange={(v) => setSource(v as "local" | "platform")}
                    options={[
                        { label: "本地素材", value: "local" },
                        { label: "平台资产", value: "platform" },
                    ]}
                />
            </div>
            {source === "local" ? (
                <MyAssetsTab
                    onInsert={(payload) => {
                        onInsert(payload);
                        onClose();
                    }}
                />
            ) : (
                <PlatformAssetsBrowser
                    showSaveLocal
                    onInsert={(payload) => {
                        onInsert(payload);
                        onClose();
                    }}
                />
            )}
        </Modal>
    );
}

const PAGE_SIZE = 8;

const kindOptions = [
    { label: "全部", value: "all" },
    { label: "文本", value: "text" },
    { label: "图片", value: "image" },
    { label: "视频", value: "video" },
];

function PickerCard({ title, kind, cover, onClick }: { title: string; kind: string; cover: string; onClick: () => void }) {
    return (
        <button
            type="button"
            className="group relative cursor-pointer overflow-hidden rounded-lg border border-stone-200 bg-white text-left transition hover:border-stone-400 hover:shadow-md dark:border-stone-700 dark:bg-stone-900 dark:hover:border-stone-500"
            onClick={onClick}
        >
            {cover ? (
                <OssThumbImage src={cover} alt={title} maxWidth={480} className="aspect-[4/3] w-full object-cover" />
            ) : (
                <div className="flex aspect-[4/3] items-center justify-center bg-stone-100 p-3 text-center text-xs leading-5 text-stone-500 dark:bg-stone-800 dark:text-stone-400">{title}</div>
            )}
            <div className="p-2.5">
                <div className="flex items-center justify-between gap-2">
                    <span className="line-clamp-1 text-xs font-medium text-stone-800 dark:text-stone-200">{title}</span>
                    <Tag className="m-0 shrink-0 text-[10px]">{kind === "image" ? "图片" : kind === "video" ? "视频" : "文本"}</Tag>
                </div>
            </div>
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-stone-950/0 text-sm font-medium text-white opacity-0 transition group-hover:bg-stone-950/55 group-hover:opacity-100">插入</div>
        </button>
    );
}

function MyAssetsTab({ onInsert }: { onInsert: (payload: InsertAssetPayload) => void }) {
    const assets = useAssetStore((state) => state.assets);
    const [keyword, setKeyword] = useState("");
    const [kindFilter, setKindFilter] = useState("all");
    const [page, setPage] = useState(1);

    const filtered = useMemo(() => {
        const query = keyword.trim().toLowerCase();
        return assets
            .filter((a) => a.kind === "text" || a.kind === "image" || a.kind === "video")
            .filter((a) => kindFilter === "all" || a.kind === kindFilter)
            .filter((a) => !query || [a.title, ...(a.tags || [])].join(" ").toLowerCase().includes(query));
    }, [assets, keyword, kindFilter]);

    const visible = useMemo(() => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [filtered, page]);

    useEffect(() => {
        const maxPage = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
        setPage((v) => Math.min(v, maxPage));
    }, [filtered.length]);

    const handleInsert = (asset: Asset) => {
        if (asset.kind === "text") {
            onInsert({ kind: "text", content: asset.data.content, title: asset.title });
        } else {
            onInsert(asset.kind === "video" ? { kind: "video", url: asset.data.url, storageKey: asset.data.storageKey, title: asset.title, width: asset.data.width, height: asset.data.height } : { kind: "image", dataUrl: asset.data.dataUrl, storageKey: asset.data.storageKey, title: asset.title, compliance: readLocalAssetCompliance(asset) || undefined });
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
                <Input
                    className="w-56"
                    size="small"
                    prefix={<Search className="size-3.5 text-stone-400" />}
                    placeholder="搜索资产"
                    value={keyword}
                    allowClear
                    onChange={(e) => {
                        setPage(1);
                        setKeyword(e.target.value);
                    }}
                />
                <div className="flex gap-1.5">
                    {kindOptions.map((opt) => (
                        <Tag.CheckableTag
                            key={opt.value}
                            checked={kindFilter === opt.value}
                            className={cn("prompt-filter-tag", kindFilter === opt.value && "is-active")}
                            onChange={() => {
                                setPage(1);
                                setKindFilter(opt.value);
                            }}
                        >
                            {opt.label}
                        </Tag.CheckableTag>
                    ))}
                </div>
            </div>

            {visible.length ? (
                <div className="grid grid-cols-4 gap-3">
                    {visible.map((asset) => (
                        <PickerCard key={asset.id} title={asset.title} kind={asset.kind} cover={asset.coverUrl || (asset.kind === "image" ? asset.data.dataUrl : "")} onClick={() => handleInsert(asset)} />
                    ))}
                </div>
            ) : (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="没有本地资产" className="py-12" />
            )}

            {filtered.length > PAGE_SIZE && (
                <div className="flex justify-center">
                    <Pagination size="small" current={page} pageSize={PAGE_SIZE} total={filtered.length} onChange={setPage} showSizeChanger={false} />
                </div>
            )}
        </div>
    );
}

function readLocalAssetCompliance(asset: Asset): ImportComplianceMeta | null {
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
