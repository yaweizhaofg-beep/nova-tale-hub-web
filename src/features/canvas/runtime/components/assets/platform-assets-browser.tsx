import { useEffect, useState } from "react";
import { App, Empty, Input, Pagination, Segmented, Spin, Tag } from "antd";
import { Search } from "canvas-lucide";
import { useQuery } from "@tanstack/react-query";

import type { InsertAssetPayload } from "@canvas/components/canvas/asset-picker-modal";
import { setAssetDragData } from "@canvas/lib/canvas/canvas-asset-dnd";
import { getPlatformActorIds } from "@canvas/lib/auth-token";
import { rewriteOssPublicUrl } from "@canvas/lib/platform/oss-upload";
import { OssThumbImage } from "@canvas/lib/platform/oss-image";
import { cn } from "@canvas/lib/utils";
import { fetchInfiniteCanvasAssets, type DramaAssetDto } from "@canvas/services/api/backend-client";
import { useAssetStore } from "@canvas/stores/use-asset-store";

export type PlatformKindFilter = "all" | "IMAGE" | "VIDEO" | "AUDIO";

type Props = {
  /** 选择插入画布 / 工作台 */
  onInsert?: (payload: InsertAssetPayload) => void;
  /** 紧凑模式（侧栏） */
  compact?: boolean;
  className?: string;
  /** 是否显示「加入本地」 */
  showSaveLocal?: boolean;
};

function mapKind(assetType?: string): "image" | "video" | "audio" | null {
  const t = String(assetType || "").toUpperCase();
  if (t === "IMAGE") return "image";
  if (t === "VIDEO") return "video";
  if (t === "AUDIO") return "audio";
  return null;
}

function kindLabel(kind: "image" | "video" | "audio" | null) {
  if (kind === "video") return "视频";
  if (kind === "audio") return "音频";
  return "图片";
}

function toInsertPayload(asset: DramaAssetDto): InsertAssetPayload | null {
  const kind = mapKind(asset.assetType);
  const url = rewriteOssPublicUrl(asset.ossUrl?.trim());
  if (!kind || !url) return null;
  const title = asset.name || asset.alias || `平台资产 ${asset.id}`;
  if (kind === "video") return { kind: "video", url, title };
  if (kind === "audio") return { kind: "audio", url, title };
  return { kind: "image", dataUrl: url, title };
}

async function loadPage(params: {
  page: number;
  pageSize: number;
  keyword: string;
  kindFilter: PlatformKindFilter;
}) {
  const { page, pageSize, keyword, kindFilter } = params;
  const { staffId, talentId } = getPlatformActorIds();
  const data = await fetchInfiniteCanvasAssets({
    page: page - 1,
    size: pageSize,
    name: keyword.trim() || undefined,
    assetType: kindFilter === "all" ? "ALL" : kindFilter,
    staffId,
    talentId,
  });
  return { items: data.content || [], total: data.totalElements ?? 0 };
}

export function PlatformAssetsBrowser({ onInsert, compact, className, showSaveLocal = false }: Props) {
  const { message } = App.useApp();
  const addAsset = useAssetStore((s) => s.addAsset);
  const [keyword, setKeyword] = useState("");
  const [kindFilter, setKindFilter] = useState<PlatformKindFilter>("all");
  const [page, setPage] = useState(1);
  const pageSize = compact ? 12 : 16;

  const query = useQuery({
    queryKey: ["platform-drama-assets", page, pageSize, keyword, kindFilter],
    queryFn: () => loadPage({ page, pageSize, keyword, kindFilter }),
    staleTime: 15_000,
  });

  useEffect(() => {
    setPage(1);
  }, [keyword, kindFilter]);

  const items = query.data?.items || [];
  const total = query.data?.total || 0;

  const handleInsert = (asset: DramaAssetDto) => {
    const payload = toInsertPayload(asset);
    if (!payload) {
      message.warning("该资产无可插入的媒体地址");
      return;
    }
    onInsert?.(payload);
  };

  const saveLocal = (asset: DramaAssetDto) => {
    const payload = toInsertPayload(asset);
    if (!payload) {
      message.warning("该资产无法加入本地");
      return;
    }
    if (payload.kind === "image") {
      addAsset({
        kind: "image",
        title: payload.title,
        coverUrl: payload.dataUrl,
        tags: ["平台"],
        source: "平台资产",
        data: { dataUrl: payload.dataUrl, width: 0, height: 0, bytes: 0, mimeType: "image/png" },
        metadata: { source: "platform", dramaAssetId: asset.id },
      });
    } else if (payload.kind === "video") {
      addAsset({
        kind: "video",
        title: payload.title,
        coverUrl: "",
        tags: ["平台"],
        source: "平台资产",
        data: { url: payload.url, width: 0, height: 0, bytes: 0, mimeType: "video/mp4" },
        metadata: { source: "platform", dramaAssetId: asset.id },
      });
    } else if (payload.kind === "audio") {
      message.info("本地素材暂不支持音频，请直接插入画布");
      return;
    }
    message.success("已加入本地素材");
  };

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className={cn("gap-2", compact ? "grid" : "flex flex-wrap items-center")}>
        <Input
          className={compact ? "!h-8 !rounded-lg" : "w-56"}
          size="small"
          allowClear
          prefix={<Search className="size-3.5 text-stone-400" />}
          aria-label="搜索平台资产"
          placeholder="搜索平台资产"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
        <Segmented
          size="small"
          block={compact}
          aria-label="平台资产类型"
          value={kindFilter}
          onChange={(v) => setKindFilter(v as PlatformKindFilter)}
          options={[
            { label: "全部", value: "all" },
            { label: "图片", value: "IMAGE" },
            { label: "视频", value: "VIDEO" },
            { label: "音频", value: "AUDIO" },
          ]}
        />
      </div>

      {query.isLoading ? (
        <div className="flex justify-center py-16">
          <Spin />
        </div>
      ) : query.isError ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="平台资产加载失败，请确认已登录且后端可用" className={compact ? "rounded-xl border border-dashed border-border bg-card py-7" : "py-12"} />
      ) : !items.length ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无平台资产" className={compact ? "rounded-xl border border-dashed border-border bg-card py-7" : "py-12"} />
      ) : (
        <div className={cn("grid gap-2", compact ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4")}>
          {items.map((asset) => {
            const kind = mapKind(asset.assetType);
            const cover = kind === "image" ? rewriteOssPublicUrl(asset.ossUrl) : "";
            const title = asset.name || asset.alias || `#${asset.id}`;
            const payload = onInsert ? toInsertPayload(asset) : null;
            return (
              <div
                key={asset.id}
                draggable={!!payload}
                onDragStart={(event) => {
                  if (!payload) return;
                  setAssetDragData(event.dataTransfer, payload);
                }}
                className={cn(
                  "group relative overflow-hidden rounded-xl border border-border bg-card text-left",
                  payload && "cursor-grab active:cursor-grabbing",
                )}
                title={payload ? "拖到画布或点击插入" : title}
              >
                <button
                  type="button"
                  className="block w-full text-left"
                  onClick={() => (onInsert ? handleInsert(asset) : undefined)}
                  title={onInsert ? "插入" : title}
                >
                  {cover ? (
                    <OssThumbImage src={cover} alt="" loading="lazy" maxWidth={480} className="aspect-[4/3] w-full object-cover" />
                  ) : (
                    <div className="flex aspect-[4/3] items-center justify-center bg-stone-100 p-2 text-center text-xs text-stone-500 dark:bg-stone-800 dark:text-stone-400">
                      {kindLabel(kind)}
                    </div>
                  )}
                  <div className="space-y-1 border-t border-border p-2">
                    <div className="flex items-center justify-between gap-1">
                      <span className="line-clamp-1 text-xs font-medium text-foreground">{title}</span>
                      <Tag className="m-0 shrink-0 text-[10px]">{kindLabel(kind)}</Tag>
                    </div>
                    {asset.dramaName ? <div className="line-clamp-1 text-[10px] text-stone-400">{asset.dramaName}</div> : null}
                  </div>
                </button>
                {showSaveLocal ? (
                  <button
                    type="button"
                    className="absolute bottom-2 right-2 rounded bg-stone-900/80 px-1.5 py-0.5 text-[10px] text-white opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      saveLocal(asset);
                    }}
                  >
                    加入本地
                  </button>
                ) : null}
                {onInsert ? (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-stone-950/0 text-sm font-medium text-white opacity-0 transition group-hover:bg-stone-950/45 group-hover:opacity-100">
                    插入
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      {total > pageSize ? (
        <div className="flex justify-center">
          <Pagination size="small" current={page} pageSize={pageSize} total={total} onChange={setPage} showSizeChanger={false} />
        </div>
      ) : null}
    </div>
  );
}
