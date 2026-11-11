import type { InsertAssetPayload } from "@canvas/components/canvas/asset-picker-modal";

export const CANVAS_ASSET_DRAG_MIME = "application/x-infinite-canvas-asset";

export function setAssetDragData(dataTransfer: DataTransfer, payload: InsertAssetPayload) {
    dataTransfer.setData(CANVAS_ASSET_DRAG_MIME, JSON.stringify(payload));
    dataTransfer.setData("text/plain", payload.title);
    dataTransfer.effectAllowed = "copy";
}

export function readAssetDragData(dataTransfer: DataTransfer): InsertAssetPayload | null {
    const raw = dataTransfer.getData(CANVAS_ASSET_DRAG_MIME);
    if (!raw) return null;
    try {
        return JSON.parse(raw) as InsertAssetPayload;
    } catch {
        return null;
    }
}

export function hasAssetDragData(dataTransfer: DataTransfer) {
    return Array.from(dataTransfer.types).some((type) => type === CANVAS_ASSET_DRAG_MIME || type.toLowerCase() === CANVAS_ASSET_DRAG_MIME);
}
