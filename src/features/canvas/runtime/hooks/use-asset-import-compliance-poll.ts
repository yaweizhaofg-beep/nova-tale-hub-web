import { useEffect, useRef } from "react";

import { isImportCompliancePending, pollImportImageCompliance } from "@canvas/lib/canvas/canvas-import-compliance";
import { useAssetStore, type Asset } from "@canvas/stores/use-asset-store";

const POLL_MS = 4000;
const GIVE_UP_MS = 3 * 60 * 1000;
const TERMINAL = new Set(["ACTIVE", "FAILED"]);

function pendingKey(assets: Asset[]) {
    return assets
        .filter((asset) => asset.kind === "image" && isImportCompliancePending(asset.metadata as { complianceSource?: string; complianceAssetId?: number; complianceStatus?: string }))
        .map((asset) => `${asset.id}:${asset.metadata?.complianceAssetId}`)
        .sort()
        .join("|");
}

/** 本地资产库中未终态的导入图合规轮询 */
export function useAssetImportCompliancePoll(enabled = true) {
    const assets = useAssetStore((state) => state.assets);
    const updateAsset = useAssetStore((state) => state.updateAsset);
    const assetsRef = useRef(assets);
    assetsRef.current = assets;
    const inflightRef = useRef(new Set<string>());
    const startedAtRef = useRef(new Map<string, number>());
    const key = enabled ? pendingKey(assets) : "";

    useEffect(() => {
        if (!key) return;
        let cancelled = false;
        let timer: number | undefined;

        const scheduleNext = () => {
            if (cancelled) return;
            if (!pendingKey(assetsRef.current)) {
                timer = undefined;
                return;
            }
            timer = window.setTimeout(() => void tick(), POLL_MS);
        };

        const tick = async () => {
            const targets = assetsRef.current.filter(
                (asset) => asset.kind === "image" && isImportCompliancePending(asset.metadata as { complianceSource?: string; complianceAssetId?: number; complianceStatus?: string }),
            );
            if (!targets.length) {
                timer = undefined;
                return;
            }

            for (const asset of targets) {
                const assetId = Number(asset.metadata?.complianceAssetId);
                if (!assetId || inflightRef.current.has(asset.id)) continue;
                inflightRef.current.add(asset.id);
                const started = startedAtRef.current.get(asset.id) ?? Date.now();
                startedAtRef.current.set(asset.id, started);
                try {
                    if (Date.now() - started >= GIVE_UP_MS) {
                        updateAsset(asset.id, {
                            metadata: {
                                ...(asset.metadata || {}),
                                complianceSource: "import",
                                complianceStatus: "FAILED",
                                complianceError: "合规检测超时已停止轮询",
                            },
                        });
                        startedAtRef.current.delete(asset.id);
                        continue;
                    }
                    const next = await pollImportImageCompliance(assetId);
                    if (cancelled || !next) continue;
                    if (TERMINAL.has(next.complianceStatus)) startedAtRef.current.delete(asset.id);
                    const current = assetsRef.current.find((item) => item.id === asset.id);
                    if (!current) continue;
                    const m = current.metadata || {};
                    if (m.complianceStatus === next.complianceStatus && m.complianceError === next.complianceError && m.complianceAssetId === next.complianceAssetId && m.arkAssetId === next.arkAssetId) {
                        continue;
                    }
                    updateAsset(asset.id, { metadata: { ...m, ...next } });
                } catch {
                    /* 下一轮再试 */
                } finally {
                    inflightRef.current.delete(asset.id);
                }
            }
            scheduleNext();
        };

        void tick();
        return () => {
            cancelled = true;
            if (timer !== undefined) window.clearTimeout(timer);
        };
    }, [key, updateAsset]);
}
