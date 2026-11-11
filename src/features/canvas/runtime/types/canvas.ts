export type Position = {
    x: number;
    y: number;
};

export type ViewportTransform = {
    x: number;
    y: number;
    k: number;
};

export enum CanvasNodeType {
    Image = "image",
    Text = "text",
    Config = "config",
    Video = "video",
    Audio = "audio",
    Group = "group",
}

// 节点类型放开为字符串,内置类型用 CanvasNodeType,插件类型为 "<pluginId>:<name>"
export type CanvasNodeTypeId = CanvasNodeType | (string & {});

export type CanvasNodeStatus = "idle" | "success" | "loading" | "error";
export type CanvasGenerationMode = "text" | "image" | "video" | "audio";
export type CanvasImageGenerationType = "generation" | "edit";

export type CanvasNodeMetadata = {
    content?: string;
    composerContent?: string;
    prompt?: string;
    status?: CanvasNodeStatus;
    /** loading 态文案，如「生成中」 */
    loadingLabel?: string;
    errorDetails?: string;
    fontSize?: number;
    generationMode?: CanvasGenerationMode;
    generationType?: CanvasImageGenerationType;
    model?: string;
    reasoningEffort?: "auto" | "low" | "medium" | "high" | "xhigh";
    size?: string;
    quality?: string;
    background?: string;
    count?: number;
    seconds?: string;
    vquality?: string;
    generateAudio?: string;
    watermark?: string;
    /** 视频随机种子；留空则不传 */
    seed?: string;
    audioVoice?: string;
    audioFormat?: string;
    audioSpeed?: string;
    audioInstructions?: string;
    audioPitch?: string;
    audioVolume?: string;
    audioSubtitle?: string;
    audioOriginalDuration?: number;
    audioConsumedPoints?: number;
    audioSubtitleJson?: string;
    audioReferenceSnapshot?: { type: "audio" | "image" | "speaker"; value: string }[];
    references?: string[];
    naturalWidth?: number;
    naturalHeight?: number;
    freeResize?: boolean;
    isBatchRoot?: boolean;
    batchRootId?: string;
    batchChildIds?: string[];
    batchUsesReferenceImages?: boolean;
    primaryImageId?: string;
    imageBatchExpanded?: boolean;
    storageKey?: string;
    mimeType?: string;
    bytes?: number;
    durationMs?: number;
    /** 临时链视频的展示封面（OSS 图片）。播放和生成仍用 content。 */
    posterUrl?: string;
    /** 平台生成视频过期时间戳（毫秒）；本地上传视频不写 */
    videoExpiresAt?: number;
    groupId?: string;
    interactive?: boolean; // 插件节点「交互 ⇄ 移动」开关状态(见 CanvasNodeDefinition.interactionToggle)
    /** 平台异步任务 id；刷新后凭此继续轮询；生图成功后保留以便查询合规 */
    platformTaskId?: string;
    platformTaskKind?: "image" | "video" | "audio";
    platformModelKey?: string;
    /** 画布生图合规：PROCESSING / ACTIVE / FAILED；无登记资产时为 undefined */
    complianceStatus?: "PROCESSING" | "ACTIVE" | "FAILED";
    complianceError?: string;
    /** 合规登记用的剧目资产 id（轮询 by-asset） */
    complianceAssetId?: number;
    /** 方舟合规通过后的资产 id，生视频可传 asset://{arkAssetId} */
    arkAssetId?: string;
    /** 合规记录所属模型供应商 id；与当前视频线路不一致时回退 https */
    complianceSupplierId?: number;
    /** import=导入图登记；缺省且有 platformTaskId 时按生图任务轮询 */
    complianceSource?: "import" | "generation";
    /** 各视频线路合规快照（国内方舟 + 海外 BYTEPLUS 等） */
    complianceLines?: Array<{
        supplierId: number;
        supplierCode?: string;
        complianceStatus: "PROCESSING" | "ACTIVE" | "FAILED";
        arkAssetId?: string;
        complianceError?: string;
    }>;
};

export type CanvasNodeData = {
    id: string;
    type: CanvasNodeTypeId;
    title: string;
    position: Position;
    width: number;
    height: number;
    metadata?: CanvasNodeMetadata;
};

export type CanvasConnection = {
    id: string;
    fromNodeId: string;
    toNodeId: string;
};

export type CanvasAssistantReference = {
    id: string;
    type: CanvasNodeTypeId;
    title: string;
    dataUrl?: string;
    storageKey?: string;
    text?: string;
};

export type CanvasAssistantImage = {
    id: string;
    dataUrl: string;
    storageKey?: string;
    prompt: string;
};

export type CanvasAssistantMessage = {
    id: string;
    role: "user" | "assistant" | "system" | "tool" | "error";
    title?: string;
    text: string;
    meta?: string;
    detail?: unknown;
    references?: CanvasAssistantReference[];
};

export type CanvasAssistantSession = {
    id: string;
    title: string;
    messages: CanvasAssistantMessage[];
    createdAt: string;
    updatedAt: string;
};

export type ConnectionHandle = {
    nodeId: string;
    handleType: "source" | "target";
};

export type SelectionBox = {
    startWorldX: number;
    startWorldY: number;
    currentWorldX: number;
    currentWorldY: number;
    additive: boolean;
    initialSelectedNodeIds: string[];
};

export type ContextMenuState =
    | {
          type: "node";
          x: number;
          y: number;
          nodeId: string;
      }
    | {
          type: "connection";
          x: number;
          y: number;
          connectionId: string;
      };
