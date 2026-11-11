import { uploadBlobToOss } from "@canvas/lib/canvas/canvas-cloud-save";
import { isRemoteHttpUrl, submitImportImageComplianceSafe, type ImportComplianceMeta } from "@canvas/lib/canvas/canvas-import-compliance";
import { getImageBlob, uploadImage } from "@canvas/services/image-storage";

export type PreparedLocalImage = {
    dataUrl: string;
    storageKey?: string;
    width: number;
    height: number;
    bytes: number;
    mimeType: string;
    compliance?: ImportComplianceMeta;
};

/** 本地图片上传：落本地 → 直传 OSS → 提交合规 */
export async function prepareLocalImageAsset(file: File): Promise<PreparedLocalImage> {
    const local = await uploadImage(file);
    let dataUrl = local.url;
    let storageKey: string | undefined = local.storageKey;
    let compliance: ImportComplianceMeta | undefined;

    if (local.storageKey) {
        try {
            const blob = await getImageBlob(local.storageKey);
            if (blob) {
                const ossUrl = await uploadBlobToOss(blob, file.name || "image.png");
                dataUrl = ossUrl;
                storageKey = undefined;
            }
        } catch (error) {
            console.warn("local asset oss upload failed", error);
        }
    } else if (isRemoteHttpUrl(local.url)) {
        dataUrl = local.url;
        storageKey = undefined;
    }

    if (isRemoteHttpUrl(dataUrl)) {
        compliance = (await submitImportImageComplianceSafe(dataUrl, file.name)) || undefined;
    }

    return {
        dataUrl,
        storageKey,
        width: local.width,
        height: local.height,
        bytes: local.bytes,
        mimeType: local.mimeType,
        compliance,
    };
}

export function complianceBadgeLabel(status?: string) {
    if (status === "ACTIVE") return "已合规";
    if (status === "FAILED") return "合规失败";
    if (status === "PROCESSING") return "合规检测中";
    return null;
}
