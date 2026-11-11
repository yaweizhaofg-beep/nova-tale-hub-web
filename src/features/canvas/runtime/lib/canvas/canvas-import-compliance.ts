import {
    fetchCanvasImportImageCompliance,
    submitCanvasImportImageCompliance,
    type CanvasComplianceLineDto,
    type CanvasImageComplianceDto,
} from "@canvas/services/api/backend-client";
import {
    currentVideoRouteSupportsArkAssetUri,
    getPlatformVideoSupplierId,
    listArkCapableVideoSupplierIds,
} from "@canvas/services/api/platform-models";
import { originalImageUrl } from "@canvas/lib/platform/oss-image";

export type ComplianceLineMeta = {
    supplierId: number;
    supplierCode?: string;
    complianceStatus: "PROCESSING" | "ACTIVE" | "FAILED";
    arkAssetId?: string;
    complianceError?: string;
};

export type ImportComplianceMeta = {
    complianceSource: "import";
    complianceAssetId?: number;
    arkAssetId?: string;
    complianceSupplierId?: number;
    complianceStatus: "PROCESSING" | "ACTIVE" | "FAILED";
    complianceError?: string;
    /** 国内方舟 + 海外 BYTEPLUS 等各线路合规快照 */
    complianceLines?: ComplianceLineMeta[];
};

const TERMINAL = new Set(["ACTIVE", "FAILED"]);

export function isRemoteHttpUrl(url?: string | null) {
    return Boolean(url && /^https?:\/\//i.test(url.trim()));
}

function normalizeStatus(raw?: string | null): "PROCESSING" | "ACTIVE" | "FAILED" {
    const s = String(raw || "").trim().toUpperCase();
    return s === "ACTIVE" || s === "FAILED" || s === "PROCESSING" ? s : "PROCESSING";
}

export function normalizeComplianceLines(rows?: CanvasComplianceLineDto[] | null): ComplianceLineMeta[] {
    if (!Array.isArray(rows)) return [];
    const out: ComplianceLineMeta[] = [];
    for (const row of rows) {
        if (row?.supplierId == null) continue;
        const status = normalizeStatus(row.complianceStatus);
        const ark = String(row.complianceAssetId || "").trim();
        out.push({
            supplierId: Number(row.supplierId),
            supplierCode: row.supplierCode || undefined,
            complianceStatus: status,
            arkAssetId: status === "ACTIVE" && ark ? ark : undefined,
            complianceError: row.complianceError || undefined,
        });
    }
    return out;
}

/** 按当前视频线路从多线路快照中取一条；无匹配则回退顶层字段 */
export function pickComplianceForVideoRoute(meta?: {
    complianceStatus?: string;
    arkAssetId?: string | null;
    complianceSupplierId?: number | null;
    complianceError?: string;
    complianceLines?: ComplianceLineMeta[];
} | null, videoSupplierId = getPlatformVideoSupplierId()): {
    complianceStatus?: "PROCESSING" | "ACTIVE" | "FAILED";
    arkAssetId?: string;
    complianceSupplierId?: number;
    complianceError?: string;
} {
    if (!meta) return {};
    const videoSid = videoSupplierId;
    const lines = meta.complianceLines || [];
    if (videoSid != null && lines.length) {
        const hit = lines.find((l) => Number(l.supplierId) === Number(videoSid));
        if (hit) {
            return {
                complianceStatus: hit.complianceStatus,
                arkAssetId: hit.arkAssetId,
                complianceSupplierId: hit.supplierId,
                complianceError: hit.complianceError,
            };
        }
    }
    return {
        complianceStatus: meta.complianceStatus ? normalizeStatus(meta.complianceStatus) : undefined,
        arkAssetId: meta.arkAssetId || undefined,
        complianceSupplierId: meta.complianceSupplierId != null ? Number(meta.complianceSupplierId) : undefined,
        complianceError: meta.complianceError,
    };
}

/** 从合规 DTO 抽出可写入节点的字段（剧目资产 id + 各方舟线路快照） */
export function complianceMetaFromDto(
    row: Pick<
        CanvasImageComplianceDto,
        "id" | "complianceStatus" | "complianceError" | "complianceAssetId" | "complianceSupplierId" | "complianceLines"
    > & {
        complianceSource?: "import" | "generation";
    },
): {
    complianceStatus: "PROCESSING" | "ACTIVE" | "FAILED";
    complianceError?: string;
    complianceAssetId?: number;
    arkAssetId?: string;
    complianceSupplierId?: number;
    complianceSource?: "import" | "generation";
    complianceLines?: ComplianceLineMeta[];
} {
    const lines = normalizeComplianceLines(row.complianceLines);
    const picked = pickComplianceForVideoRoute({
        complianceStatus: row.complianceStatus || undefined,
        arkAssetId: String(row.complianceAssetId || "").trim() || undefined,
        complianceSupplierId: row.complianceSupplierId != null ? Number(row.complianceSupplierId) : undefined,
        complianceError: row.complianceError || undefined,
        complianceLines: lines,
    });
    // 顶层无线路字段时，用 DTO 单行兜底
    const status = picked.complianceStatus || normalizeStatus(row.complianceStatus);
    const arkFromDto = String(row.complianceAssetId || "").trim();
    return {
        complianceStatus: status,
        complianceError: picked.complianceError || row.complianceError || undefined,
        complianceAssetId: row.id,
        arkAssetId: picked.arkAssetId || (status === "ACTIVE" && arkFromDto ? arkFromDto : undefined),
        complianceSupplierId: picked.complianceSupplierId ?? (row.complianceSupplierId != null ? Number(row.complianceSupplierId) : undefined),
        ...(row.complianceSource ? { complianceSource: row.complianceSource } : {}),
        ...(lines.length ? { complianceLines: lines } : {}),
    };
}

export function normalizeImportCompliance(row: CanvasImageComplianceDto): ImportComplianceMeta {
    const meta = complianceMetaFromDto({ ...row, complianceSource: "import" });
    return {
        complianceSource: "import",
        complianceAssetId: meta.complianceAssetId,
        arkAssetId: meta.arkAssetId,
        complianceSupplierId: meta.complianceSupplierId,
        complianceStatus: meta.complianceStatus,
        complianceError: meta.complianceError,
        complianceLines: meta.complianceLines,
    };
}

/** 当前视频线路下参考图是否已具备可传 asset:// 的合规快照 */
export function hasMatchingArkCompliance(meta?: {
    complianceStatus?: string;
    arkAssetId?: string | null;
    complianceSupplierId?: number | null;
    complianceLines?: ComplianceLineMeta[];
}) {
    if (!currentVideoRouteSupportsArkAssetUri()) return false;
    const picked = pickComplianceForVideoRoute(meta);
    if (String(picked.complianceStatus || "").toUpperCase() !== "ACTIVE") return false;
    if (!String(picked.arkAssetId || "").trim()) return false;
    const videoSid = getPlatformVideoSupplierId();
    if (videoSid == null) return true;
    if (picked.complianceSupplierId == null) return false;
    return Number(picked.complianceSupplierId) === Number(videoSid);
}

/** 对已上云的导入图片提交合规（国内方舟 + 海外 BYTEPLUS 并行） */
export async function submitImportImageComplianceSafe(ossUrl: string, name?: string, videoSupplierId?: number): Promise<ImportComplianceMeta | null> {
    if (!isRemoteHttpUrl(ossUrl)) return null;
    try {
        const modelSupplierIds = listArkCapableVideoSupplierIds();
        const currentId = videoSupplierId ?? getPlatformVideoSupplierId();
        if (currentId != null && !modelSupplierIds.includes(currentId)) modelSupplierIds.push(currentId);
        const row = await submitCanvasImportImageCompliance({
            ossUrl: originalImageUrl(ossUrl),
            name,
            ...(modelSupplierIds.length
                ? { modelSupplierIds }
                : currentId != null
                  ? { modelSupplierId: currentId }
                  : {}),
        });
        return normalizeImportCompliance(row);
    } catch (error) {
        console.warn("import image compliance submit failed", error);
        return {
            complianceSource: "import",
            complianceStatus: "FAILED",
            complianceError: error instanceof Error ? error.message : "合规提交失败",
        };
    }
}

export async function pollImportImageCompliance(assetId: number): Promise<ImportComplianceMeta | null> {
    if (!assetId) return null;
    const row = await fetchCanvasImportImageCompliance(assetId);
    return normalizeImportCompliance({ ...row, id: row.id ?? assetId });
}

export function isImportCompliancePending(meta?: {
    complianceSource?: string;
    complianceAssetId?: number;
    complianceStatus?: string;
    complianceSupplierId?: number;
    arkAssetId?: string;
    complianceLines?: ComplianceLineMeta[];
}) {
    if (meta?.complianceSource !== "import") return false;
    if (!meta.complianceAssetId) return false;
    // 方舟/BytePlus：看当前线路那一条是否终态
    if (currentVideoRouteSupportsArkAssetUri()) {
        const picked = pickComplianceForVideoRoute(meta);
        if (!picked.complianceStatus) return true;
        if (!TERMINAL.has(picked.complianceStatus)) return true;
        // ACTIVE 但缺 ark id：继续轮询补齐
        if (picked.complianceStatus === "ACTIVE" && !picked.arkAssetId) return true;
        // 当前线路尚无记录：若其它线路在跑也继续轮询（等 complianceLines 补齐）
        const videoSid = getPlatformVideoSupplierId();
        if (videoSid != null && meta.complianceLines?.length) {
            const hasLine = meta.complianceLines.some((l) => Number(l.supplierId) === Number(videoSid));
            if (!hasLine) return true;
        }
        return false;
    }
    const status = meta.complianceStatus;
    return !status || !TERMINAL.has(status);
}

/** 从节点/资产 metadata 抽出可持久化的角标字段（不含 platformTaskId） */
export function pickComplianceBadgeMeta(meta?: {
    complianceSource?: string;
    complianceAssetId?: number;
    arkAssetId?: string;
    complianceSupplierId?: number;
    complianceStatus?: string;
    complianceError?: string;
    complianceLines?: ComplianceLineMeta[];
}): Record<string, unknown> {
    if (!meta?.complianceStatus && !meta?.complianceLines?.length) return {};
    const picked = pickComplianceForVideoRoute(meta);
    const out: Record<string, unknown> = {};
    if (picked.complianceStatus) out.complianceStatus = picked.complianceStatus;
    else if (meta.complianceStatus) out.complianceStatus = meta.complianceStatus;
    if (meta.complianceSource) out.complianceSource = meta.complianceSource;
    if (meta.complianceAssetId != null) out.complianceAssetId = meta.complianceAssetId;
    if (picked.arkAssetId) out.arkAssetId = picked.arkAssetId;
    if (picked.complianceSupplierId != null) out.complianceSupplierId = picked.complianceSupplierId;
    if (picked.complianceError) out.complianceError = picked.complianceError;
    if (meta.complianceLines?.length) out.complianceLines = meta.complianceLines;
    return out;
}

export async function ensureImportComplianceMeta(
    ossUrl: string | undefined,
    options?: {
        title?: string;
        existing?: {
            complianceStatus?: string;
            platformTaskId?: string;
            arkAssetId?: string;
            complianceSupplierId?: number;
            complianceLines?: ComplianceLineMeta[];
        } | null;
    },
): Promise<ImportComplianceMeta | null> {
    if (!isRemoteHttpUrl(ossUrl)) return null;
    if (options?.existing?.platformTaskId) return null;
    if (options?.existing?.complianceStatus || options?.existing?.complianceLines?.length) {
        if (!currentVideoRouteSupportsArkAssetUri()) return null;
        if (hasMatchingArkCompliance(options.existing)) return null;
        // 已有多线路快照时交给轮询补齐，避免重复打满所有线路
        if (options.existing.complianceLines?.length) return null;
    }
    return submitImportImageComplianceSafe(ossUrl!, options?.title);
}

/** 合规 ACTIVE 且有方舟资产 id 时返回 asset://，否则 null（调用方回退 https） */
export function resolveArkAssetUri(opts: {
    complianceStatus?: string;
    arkAssetId?: string | null;
    complianceSupplierId?: number | null;
    videoSupplierId?: number | null;
    complianceLines?: ComplianceLineMeta[];
}): string | null {
    const videoSid = opts.videoSupplierId ?? getPlatformVideoSupplierId();
    const picked = pickComplianceForVideoRoute({
        complianceStatus: opts.complianceStatus,
        arkAssetId: opts.arkAssetId,
        complianceSupplierId: opts.complianceSupplierId,
        complianceLines: opts.complianceLines,
    }, videoSid);
    if (String(picked.complianceStatus || "").toUpperCase() !== "ACTIVE") return null;
    const ark = String(picked.arkAssetId || "").trim();
    if (!ark) return null;
    if (
        videoSid != null &&
        (picked.complianceSupplierId == null || Number(picked.complianceSupplierId) !== Number(videoSid))
    ) {
        return null;
    }
    return `asset://${ark}`;
}
