export type ReferenceImage = {
    id: string;
    name: string;
    type: string;
    dataUrl: string;
    url?: string;
    storageKey?: string;
    /** 合规 ACTIVE 时的方舟资产 id，视频生成可传 asset:// */
    arkAssetId?: string;
    complianceStatus?: "PROCESSING" | "ACTIVE" | "FAILED";
    complianceSupplierId?: number;
    complianceLines?: Array<{
        supplierId: number;
        supplierCode?: string;
        complianceStatus: "PROCESSING" | "ACTIVE" | "FAILED";
        arkAssetId?: string;
        complianceError?: string;
    }>;
};
