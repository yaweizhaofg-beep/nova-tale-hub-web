import { imageReferenceLabel } from "@canvas/lib/image-reference-prompt";
import { seedanceReferenceLabel } from "@canvas/lib/seedance-video";
import { getNodeDefinition } from "@canvas/lib/canvas/node-registry";
import { CanvasNodeType, type CanvasConnection, type CanvasNodeData } from "@canvas/types/canvas";

export type CanvasResourceKind = "image" | "video" | "audio" | "text";

export type CanvasResourceReference = {
    id: string;
    nodeId: string;
    kind: CanvasResourceKind;
    label: string;
    title: string;
    previewUrl?: string;
    posterUrl?: string;
    text?: string;
    active: boolean;
};

export function buildNodeMentionReferences(node: CanvasNodeData, nodes: CanvasNodeData[], connections: CanvasConnection[]) {
    return labelResourceNodes(getMentionResourceNodes(node.id, nodes, connections), true);
}

export function getMentionResourceNodes(nodeId: string, nodes: CanvasNodeData[], connections: CanvasConnection[]) {
    const configInputs = getConnectedConfigResourceNodes(nodeId, nodes, connections);
    if (configInputs.length) return configInputs;
    const ownInputs = getContextResourceNodes(nodeId, nodes, connections);
    if (ownInputs.length) return ownInputs;
    const node = nodes.find((item) => item.id === nodeId);
    return node && isResourceNode(node) ? [node] : [];
}

export function getGenerationResourceNodes(nodeId: string, nodes: CanvasNodeData[], connections: CanvasConnection[]) {
    const configInputs = getConnectedConfigResourceNodes(nodeId, nodes, connections);
    if (configInputs.length) return configInputs;
    const ownInputs = getContextResourceNodes(nodeId, nodes, connections);
    if (ownInputs.length) return ownInputs;
    // 音频面板无入边时会把自身显示为「音频1」，实际提交必须采用同一来源。
    const node = nodes.find((item) => item.id === nodeId);
    return node?.type === CanvasNodeType.Audio && isResourceNode(node) ? [node] : [];
}

function getContextResourceNodes(nodeId: string, nodes: CanvasNodeData[], connections: CanvasConnection[]) {
    return connections
        .filter((connection) => connection.toNodeId === nodeId)
        .map((connection) => nodes.find((node) => node.id === connection.fromNodeId))
        .filter((node): node is CanvasNodeData => Boolean(node && isResourceNode(node)));
}

function getConnectedConfigResourceNodes(nodeId: string, nodes: CanvasNodeData[], connections: CanvasConnection[]) {
    const configConnection = connections.find((connection) => connection.fromNodeId === nodeId && nodes.find((node) => node.id === connection.toNodeId)?.type === CanvasNodeType.Config);
    if (!configConnection) return [];
    return getContextResourceNodes(configConnection.toNodeId, nodes, connections).filter((node) => node.id !== nodeId);
}

function labelResourceNodes(nodes: CanvasNodeData[], active: boolean) {
    const counts: Record<CanvasResourceKind, number> = { image: 0, video: 0, audio: 0, text: 0 };
    return nodes.flatMap((node): CanvasResourceReference[] => {
        const kind = resourceKind(node);
        if (!kind) return [];
        const index = counts[kind]++;
        const label = labelForKind(kind, index);
        return [
            {
                id: node.id,
                nodeId: node.id,
                kind,
                label,
                title: node.title || label,
                previewUrl: node.metadata?.content,
                posterUrl: node.metadata?.posterUrl,
                text: resourceText(node),
                active,
            },
        ];
    });
}

function labelForKind(kind: CanvasResourceKind, index: number) {
    if (kind === "image") return imageReferenceLabel(index);
    if (kind === "video") return seedanceReferenceLabel("video", index);
    if (kind === "audio") return seedanceReferenceLabel("audio", index);
    return `文本${index + 1}`;
}

function isResourceNode(node: CanvasNodeData) {
    return Boolean(resourceKind(node));
}

/**
 * 去掉提示词中的引用 label，并把同类型更大编号依次前移（与断线后的编号对齐）。
 * 降号必须从小到大，避免图片3→图片2 与原图片2 撞车。
 */
export function removeMediaReferenceFromPrompt(prompt: string, label: string) {
    const match = /^(图片|视频|音频)(\d+)$/.exec(label);
    if (!match) {
        return prompt.split(label).join("").replace(/[ \t]{2,}/g, " ").replace(/ +\n/g, "\n").replace(/\n +/g, "\n");
    }
    const prefix = match[1];
    const index = Number(match[2]);
    const exact = (n: number) => new RegExp(`${prefix}${n}(?!\\d)`, "g");
    const sentinel = "\u0000";
    let next = prompt.replace(exact(index), sentinel);
    for (let n = index + 1; n <= 99; n += 1) {
        next = next.replace(exact(n), `${prefix}${n - 1}`);
    }
    next = next.split(sentinel).join("");
    return next
        .replace(/[ \t]{2,}/g, " ")
        .replace(/ +\n/g, "\n")
        .replace(/\n +/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .replace(/^ /g, "")
        .replace(/ $/g, "");
}

/** 断开 from→to 资源连线后，目标节点提示词应写成的内容；无需改动时返回 null */
export function nextPromptAfterDisconnectResource(toNodeId: string, fromNodeId: string, nodes: CanvasNodeData[], connections: CanvasConnection[]) {
    const toNode = nodes.find((node) => node.id === toNodeId);
    if (!toNode) return null;
    const ref = buildNodeMentionReferences(toNode, nodes, connections).find((item) => item.nodeId === fromNodeId);
    if (!ref || ref.kind === "text") return null;
    const current = toNode.metadata?.prompt || "";
    const next = removeMediaReferenceFromPrompt(current, ref.label);
    return next === current ? null : next;
}

/** 指向目标节点的入边资源连线（图片/视频/音频/文本 → 目标） */
export function getInboundResourceConnections(nodeId: string, nodes: CanvasNodeData[], connections: CanvasConnection[]) {
    return connections.filter((connection) => {
        if (connection.toNodeId !== nodeId) return false;
        const from = nodes.find((node) => node.id === connection.fromNodeId);
        return Boolean(from && isResourceNode(from));
    });
}

/**
 * 复制选区时保留的连线：
 * - 选区内两端都在的连线
 * - 选区外资源 → 选中节点的入边（粘贴时连回原资产，不克隆资产节点）
 */
export function collectCopyConnections(selectedIds: Set<string>, nodes: CanvasNodeData[], connections: CanvasConnection[]) {
    const byId = new Map<string, CanvasConnection>();
    for (const connection of connections) {
        const toSelected = selectedIds.has(connection.toNodeId);
        const fromSelected = selectedIds.has(connection.fromNodeId);
        if (toSelected && fromSelected) {
            byId.set(connection.id, connection);
            continue;
        }
        if (!toSelected || fromSelected) continue;
        const from = nodes.find((node) => node.id === connection.fromNodeId);
        if (from && isResourceNode(from)) byId.set(connection.id, connection);
    }
    return Array.from(byId.values());
}

function resourceText(node: CanvasNodeData): string | undefined {
    if (node.type === CanvasNodeType.Text) return node.metadata?.content || node.metadata?.prompt;
    const resource = getNodeDefinition(node.type)?.resource?.(node);
    return resource?.kind === "text" ? resource.text : undefined;
}

function resourceKind(node: CanvasNodeData): CanvasResourceKind | null {
    if (node.type === CanvasNodeType.Image && node.metadata?.content) return "image";
    if (node.type === CanvasNodeType.Video && (node.metadata?.content || node.metadata?.storageKey)) return "video";
    if (node.type === CanvasNodeType.Audio && (node.metadata?.content || node.metadata?.storageKey)) return "audio";
    if (node.type === CanvasNodeType.Text && (node.metadata?.content || node.metadata?.prompt)) return "text";
    // 插件节点通过 definition.resource 声明可作为输入
    return getNodeDefinition(node.type)?.resource?.(node)?.kind || null;
}
