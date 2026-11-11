import { useEffect, useRef, useState, type RefObject } from "react";
import { ArrowUp, FileText, Image as ImageIcon, Link2, LoaderCircle, Maximize2, Minimize2, Music2, Square, Video, X } from "canvas-lucide";
import { App, Button, Modal } from "antd";

import { ModelPicker } from "@canvas/components/model-picker";
import { RoutePicker } from "@canvas/components/route-picker";
import { defaultConfig, resolveModelForCapability, useConfigStore, useEffectiveConfig, type AiConfig } from "@canvas/stores/use-config-store";
import { modelChangeMetadataPatch, resolvePlatformModelMeta } from "@canvas/services/api/platform-models";
import { referenceChipDisplayLabel } from "@canvas/lib/image-reference-prompt";
import { canvasThemes, type CanvasTheme } from "@canvas/lib/canvas-theme";
import { useThemeStore } from "@canvas/stores/use-theme-store";
import { assertReferenceCountsForModel, referenceCountLimits } from "@canvas/lib/seedance-video";
import { referenceMediaLimitHint } from "@canvas/lib/seedance-video";
import { CanvasImageSettingsPopover } from "./canvas-image-settings-popover";
import { CanvasPromptChipInput, type CanvasPromptChipInputHandle } from "./canvas-prompt-chip-input";
import { CanvasAudioSettingsPopover } from "./canvas-audio-settings-popover";
import { CanvasTextSettingsPopover } from "./canvas-text-settings-popover";
import { CanvasVideoSettingsPopover } from "./canvas-video-settings-popover";
import { CanvasNodeType, type CanvasGenerationMode, type CanvasNodeData } from "@canvas/types/canvas";
import { removeMediaReferenceFromPrompt, type CanvasResourceReference } from "@canvas/lib/canvas/canvas-resource-references";
import { initialPromptWithStyle } from "@canvas/lib/canvas/style-description";
import { OSS_THUMB_WIDTH, OssThumbImage, OssVideoPoster } from "@canvas/lib/platform/oss-image";

export type CanvasNodeGenerationMode = CanvasGenerationMode;

type CanvasNodePromptPanelProps = {
    node: CanvasNodeData;
    isRunning: boolean;
    onPromptChange: (nodeId: string, prompt: string) => void;
    onConfigChange: (nodeId: string, patch: Partial<CanvasNodeData["metadata"]>) => void;
    onGenerate: (nodeId: string, mode: CanvasNodeGenerationMode, prompt: string) => void;
    onStop: (nodeId: string) => void;
    onDisconnectReference?: (toNodeId: string, fromNodeId: string) => void;
    mentionReferences?: CanvasResourceReference[];
    onImageSettingsOpenChange?: (open: boolean) => void;
    modeOverride?: CanvasNodeGenerationMode; // 插件节点用 useBuiltinPanel.mode 指定生成类型
};

export function CanvasNodePromptPanel({ node, isRunning, onPromptChange, onConfigChange, onGenerate, onStop, onDisconnectReference, mentionReferences = [], onImageSettingsOpenChange, modeOverride }: CanvasNodePromptPanelProps) {
    const { message } = App.useApp();
    const globalConfig = useEffectiveConfig();
    const openConfigDialog = useConfigStore((state) => state.openConfigDialog);
    const theme = canvasThemes[useThemeStore((state) => state.theme)];
    const mode = modeOverride ?? defaultMode(node.type);
    const config = buildNodeConfig(globalConfig, node, mode);
    const hasTextContent = node.type === CanvasNodeType.Text && Boolean(node.metadata?.content?.trim());
    const hasImageContent = node.type === CanvasNodeType.Image && Boolean(node.metadata?.content);
    const isEditingExistingContent = hasTextContent || hasImageContent;
    const [prompt, setPrompt] = useState(node.metadata?.prompt || "");
    const [promptMaximized, setPromptMaximized] = useState(false);
    const mediaReferences = mentionReferences.filter((item) => item.active && item.kind !== "text");
    const promptInputRef = useRef<CanvasPromptChipInputHandle>(null);
    const maximizedInputRef = useRef<CanvasPromptChipInputHandle>(null);
    // 本节点刚预填过风格、且 metadata 仍为空时，避免后续 sync effect 把文本框盖回空串
    const styleSeededForNodeRef = useRef<string | null>(null);

    // 切换节点时恢复提示词；图片/视频空提示词预填风格描述
    useEffect(() => {
        const stored = node.metadata?.prompt || "";
        setPromptMaximized(false);
        if (stored.trim()) {
            styleSeededForNodeRef.current = null;
            setPrompt(stored);
            return;
        }
        if (mode === "image" || mode === "video") {
            const initial = initialPromptWithStyle(globalConfig.systemPrompt);
            setPrompt(initial);
            styleSeededForNodeRef.current = initial ? node.id : null;
            if (initial && !isEditingExistingContent) onPromptChange(node.id, initial);
            return;
        }
        styleSeededForNodeRef.current = null;
        setPrompt("");
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [node.id]);

    // 外部断线重排 metadata.prompt 时同步；勿覆盖本节点刚预填、尚未写回的风格描述
    useEffect(() => {
        const next = node.metadata?.prompt || "";
        setPrompt((prev) => {
            if (prev === next) return prev;
            if (!next.trim() && styleSeededForNodeRef.current === node.id && prev.trim()) return prev;
            if (next.trim()) styleSeededForNodeRef.current = null;
            return next;
        });
    }, [node.id, node.metadata?.prompt]);

    const updatePrompt = (value: string) => {
        setPrompt(value);
        if (!isEditingExistingContent) onPromptChange(node.id, value);
    };

    const removeReference = (reference: CanvasResourceReference) => {
        // 本地先重排，断线回调里会再写一次 metadata（含键盘删连线路径）
        updatePrompt(removeMediaReferenceFromPrompt(prompt, reference.label));
        onDisconnectReference?.(node.id, reference.nodeId);
    };

    const handleModelChange = (model: string) => {
        onConfigChange(node.id, modelChangeMetadataPatch(config, model));
        if (mode !== "video") return;
        const nextKey = resolvePlatformModelMeta(config, model)?.modelKey || "";
        const images = mediaReferences.filter((item) => item.kind === "image").length;
        const videos = mediaReferences.filter((item) => item.kind === "video").length;
        const audios = mediaReferences.filter((item) => item.kind === "audio").length;
        try {
            assertReferenceCountsForModel(nextKey, images, videos, audios);
        } catch (error) {
            message.warning(`${error instanceof Error ? error.message : "参考素材超限"}，请减少连线后再生成`);
        }
    };

    const submit = () => {
        if (mode !== "image" && mode !== "video" && mode !== "text" && mode !== "audio") return;
        const text = prompt.trim();
        if (!text || isRunning) return;
        setPromptMaximized(false);
        onGenerate(node.id, mode, text);
    };

    const placeholder = promptPlaceholder(mode, hasImageContent, hasTextContent);
    const shared = {
        theme,
        mode,
        config,
        prompt,
        placeholder,
        isRunning,
        mediaReferences,
        mentionReferences,
        openConfigDialog,
        onPromptChange: updatePrompt,
        onConfigChange: (patch: Partial<CanvasNodeData["metadata"]>) => onConfigChange(node.id, patch),
        onModelChange: handleModelChange,
        onImageSettingsOpenChange,
        onRemoveReference: removeReference,
        onSubmit: submit,
        onStop: () => onStop(node.id),
        onToggleMaximize: () => setPromptMaximized((open) => !open),
    };

    return (
        <>
            <div
                data-canvas-no-zoom
                className="rounded-2xl border p-3 shadow-2xl backdrop-blur"
                style={{ background: theme.toolbar.panel, borderColor: theme.toolbar.border, color: theme.node.text, visibility: promptMaximized ? "hidden" : undefined }}
                onMouseDown={(event) => event.stopPropagation()}
                onPointerDown={(event) => event.stopPropagation()}
                onWheel={(event) => event.stopPropagation()}
            >
                {/* 放大时卸掉原面板，避免两套输入框/选择器同时挂载抢状态 */}
                {!promptMaximized ? (
                    <PromptPanelBody
                        {...shared}
                        maximized={false}
                        inputRef={promptInputRef}
                        onInsertReference={(reference) => promptInputRef.current?.insertReference(reference)}
                    />
                ) : (
                    <div className="h-40" aria-hidden />
                )}
            </div>

            <Modal
                title={null}
                open={promptMaximized}
                onCancel={() => setPromptMaximized(false)}
                footer={null}
                width={Math.min(720, typeof window !== "undefined" ? window.innerWidth - 48 : 720)}
                centered
                destroyOnHidden
                styles={{
                    container: { background: "transparent", boxShadow: "none", padding: 0 },
                    body: { padding: 0 },
                }}
            >
                <div
                    data-canvas-no-zoom
                    className="rounded-2xl border p-3 shadow-2xl backdrop-blur"
                    style={{ background: theme.toolbar.panel, borderColor: theme.toolbar.border, color: theme.node.text }}
                    onMouseDown={(event) => event.stopPropagation()}
                    onPointerDown={(event) => event.stopPropagation()}
                    onWheel={(event) => event.stopPropagation()}
                >
                    <PromptPanelBody
                        {...shared}
                        maximized
                        inputRef={maximizedInputRef}
                        onInsertReference={(reference) => maximizedInputRef.current?.insertReference(reference)}
                    />
                </div>
            </Modal>
        </>
    );
}

type PromptPanelBodyProps = {
    theme: CanvasTheme;
    mode: CanvasNodeGenerationMode;
    config: AiConfig;
    prompt: string;
    placeholder: string;
    isRunning: boolean;
    maximized?: boolean;
    mediaReferences: CanvasResourceReference[];
    mentionReferences: CanvasResourceReference[];
    inputRef: RefObject<CanvasPromptChipInputHandle>;
    openConfigDialog: (shouldPromptContinue?: boolean) => void;
    onPromptChange: (value: string) => void;
    onConfigChange: (patch: Partial<CanvasNodeData["metadata"]>) => void;
    onModelChange: (model: string) => void;
    onImageSettingsOpenChange?: (open: boolean) => void;
    onInsertReference: (reference: CanvasResourceReference) => void;
    onRemoveReference: (reference: CanvasResourceReference) => void;
    onSubmit: () => void;
    onStop: () => void;
    onToggleMaximize: () => void;
};

function PromptPanelBody({
    theme,
    mode,
    config,
    prompt,
    placeholder,
    isRunning,
    maximized = false,
    mediaReferences,
    mentionReferences,
    inputRef,
    openConfigDialog,
    onPromptChange,
    onConfigChange,
    onModelChange,
    onImageSettingsOpenChange,
    onInsertReference,
    onRemoveReference,
    onSubmit,
    onStop,
    onToggleMaximize,
}: PromptPanelBodyProps) {
    return (
        <>
            <div className="mb-2 flex justify-end">
                <button
                    type="button"
                    title={maximized ? "收起" : "放大编辑"}
                    aria-label={maximized ? "收起" : "放大编辑"}
                    className="grid size-7 place-items-center rounded-md opacity-55 transition hover:bg-black/5 hover:opacity-100 dark:hover:bg-white/10"
                    style={{ color: theme.node.text }}
                    onClick={onToggleMaximize}
                >
                    {maximized ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
                </button>
            </div>

            {(mode === "image" || mode === "video" || mode === "audio") && mediaReferences.length ? (
                <div className="mb-2 shrink-0">
                    <div className="h-14">
                        <ConnectedMediaStrip references={mediaReferences} theme={theme} onSelect={onInsertReference} onRemove={onRemoveReference} />
                    </div>
                </div>
            ) : null}

            {mode === "video" ? (
                <div className="mb-2 shrink-0">
                    <VideoReferenceLimitHint config={config} mediaReferences={mediaReferences} theme={theme} />
                </div>
            ) : null}

            <CanvasPromptChipInput
                ref={inputRef}
                value={prompt}
                references={mentionReferences}
                onChange={onPromptChange}
                onSubmit={onSubmit}
                className={`thin-scrollbar w-full cursor-text resize-none rounded-xl px-3 py-2 text-sm leading-6 outline-none ${maximized ? "h-[min(60vh,480px)]" : "h-40"}`}
                style={{ background: "transparent", color: theme.node.text }}
                placeholder={placeholder}
            />

            <div className="mt-2 flex min-w-0 items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                    {mode === "image" ? (
                        <>
                            <RoutePicker capability="image" className="max-w-[140px]" />
                            <ModelPicker config={config} value={config.model} onChange={onModelChange} capability="image" onMissingConfig={() => openConfigDialog(true)} className="max-w-[160px]" />
                            <CanvasImageSettingsPopover
                                config={config}
                                placement="topLeft"
                                buttonClassName="!h-10 !max-w-[170px] !justify-start !rounded-full !px-3"
                                onConfigChange={(key, value) => onConfigChange(key === "count" ? { count: Number(value) || 1 } : { [key]: value })}
                                onMissingConfig={() => openConfigDialog(true)}
                                onOpenChange={onImageSettingsOpenChange}
                            />
                        </>
                    ) : mode === "video" ? (
                        <>
                            <RoutePicker capability="video" className="max-w-[140px]" />
                            <ModelPicker config={config} value={config.model} onChange={onModelChange} capability="video" onMissingConfig={() => openConfigDialog(true)} className="max-w-[160px]" />
                            <CanvasVideoSettingsPopover config={config} buttonClassName="!h-10 !max-w-[170px] !justify-start !rounded-full !px-3" onConfigChange={(key, value) => onConfigChange(videoConfigPatch(key, value))} />
                        </>
                    ) : mode === "text" ? (
                        <>
                            <ModelPicker config={config} value={config.model} onChange={onModelChange} capability="text" onMissingConfig={() => openConfigDialog(true)} className="max-w-[160px]" />
                            <CanvasTextSettingsPopover config={config} buttonClassName="!h-10 !max-w-[170px] !justify-start !rounded-full !px-3" onConfigChange={(key, value) => onConfigChange({ [key]: value })} />
                        </>
                    ) : (
                        <CanvasAudioSettingsPopover config={config} onConfigChange={(key, value) => onConfigChange({ [key]: value })} />
                    )}
                </div>
                {mode === "image" || mode === "video" || mode === "text" || mode === "audio" ? (
                    <Button
                        type="primary"
                        className="!h-10 !min-w-16 shrink-0 !rounded-full !px-3"
                        danger={isRunning}
                        disabled={!isRunning && !prompt.trim()}
                        onClick={() => (isRunning ? onStop() : onSubmit())}
                        aria-label={isRunning ? "停止生成" : "生成"}
                    >
                        <span className="flex items-center gap-1.5">
                            {isRunning ? (
                                <>
                                    <LoaderCircle className="size-4 animate-spin" />
                                    <Square className="size-3.5 fill-current" />
                                    <span className="text-xs font-medium">停止</span>
                                </>
                            ) : (
                                <ArrowUp className="size-4" />
                            )}
                        </span>
                    </Button>
                ) : null}
            </div>
        </>
    );
}

function ConnectedMediaStrip({
    references,
    theme,
    onSelect,
    onRemove,
}: {
    references: CanvasResourceReference[];
    theme: CanvasTheme;
    onSelect: (reference: CanvasResourceReference) => void;
    onRemove: (reference: CanvasResourceReference) => void;
}) {
    return (
        <div className="flex h-full flex-nowrap items-center gap-2 overflow-x-auto overflow-y-hidden thin-scrollbar">
            {references.map((item) => (
                <div key={item.id} className="relative size-12 shrink-0">
                    <button
                        type="button"
                        onClick={() => onSelect(item)}
                        className="size-full overflow-hidden rounded-lg border transition hover:opacity-90"
                        style={{ borderColor: theme.node.stroke, background: theme.node.panel }}
                        title={`插入 ${item.label}`}
                    >
                        <MediaThumb reference={item} />
                        <span className="absolute right-0.5 top-0.5 rounded px-1 text-[10px] font-semibold leading-4 text-white" style={{ background: "rgba(0,0,0,.55)" }}>
                            {referenceIndex(item.label)}
                        </span>
                        <span className="absolute bottom-0.5 right-0.5 grid size-4 place-items-center rounded-full text-white" style={{ background: "rgba(0,0,0,.45)" }}>
                            <Link2 className="size-2.5" />
                        </span>
                    </button>
                    <button
                        type="button"
                        aria-label={`移除 ${item.label}`}
                        title="移除引用"
                        className="absolute left-0.5 top-0.5 z-10 grid size-4 place-items-center rounded-full bg-black/70 text-white transition hover:bg-black/90"
                        onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            onRemove(item);
                        }}
                        onPointerDown={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                        }}
                    >
                        <X className="size-2.5" strokeWidth={3} />
                    </button>
                </div>
            ))}
        </div>
    );
}

function MediaThumb({ reference }: { reference: CanvasResourceReference }) {
    if (reference.kind === "image" && reference.previewUrl) {
        return <OssThumbImage src={reference.previewUrl} maxWidth={OSS_THUMB_WIDTH} alt="" className="size-full object-cover" draggable={false} />;
    }
    if (reference.kind === "video" && (reference.posterUrl || reference.previewUrl)) {
        if (reference.posterUrl) return <OssThumbImage src={reference.posterUrl} maxWidth={OSS_THUMB_WIDTH} alt="" className="size-full object-cover" draggable={false} />;
        return <OssVideoPoster url={reference.previewUrl || ""} maxWidth={OSS_THUMB_WIDTH} className="size-full object-cover" fallback={<Video className="size-5 opacity-50" />} />;
    }
    const Icon = reference.kind === "audio" ? Music2 : reference.kind === "video" ? Video : reference.kind === "image" ? ImageIcon : FileText;
    return (
        <span className="grid size-full place-items-center opacity-50">
            <Icon className="size-5" />
        </span>
    );
}

function VideoReferenceLimitHint({
    config,
    mediaReferences,
    theme,
}: {
    config: AiConfig;
    mediaReferences: CanvasResourceReference[];
    theme: CanvasTheme;
}) {
    const modelKey = resolvePlatformModelMeta(config, config.model || config.videoModel)?.modelKey || "";
    const lim = referenceCountLimits(modelKey);
    const images = mediaReferences.filter((item) => item.kind === "image").length;
    const videos = mediaReferences.filter((item) => item.kind === "video").length;
    const audios = mediaReferences.filter((item) => item.kind === "audio").length;
    const total = images + videos + audios;
    const over = images > lim.images || videos > lim.videos || audios > lim.audios || total > lim.mediaTotal;
    return (
        <div className={`text-[11px] leading-4 ${over ? "text-red-600 dark:text-red-400" : ""}`} style={over ? undefined : { color: theme.node.muted }}>
            {referenceMediaLimitHint(modelKey)}
            {total > 0 ? `；当前 图${images} / 视频${videos} / 音频${audios}` : null}
            {over ? "（已超限，请减少连线后再生成）" : null}
        </div>
    );
}

function referenceIndex(label: string) {
    return referenceChipDisplayLabel(label);
}

function defaultMode(type: CanvasNodeData["type"]): CanvasNodeGenerationMode {
    return type === CanvasNodeType.Text ? "text" : type === CanvasNodeType.Video ? "video" : type === CanvasNodeType.Audio ? "audio" : "image";
}

function buildNodeConfig(globalConfig: AiConfig, node: CanvasNodeData, mode: CanvasNodeGenerationMode): AiConfig {
    const defaultVideoSize = globalConfig.videoSize || defaultConfig.videoSize;
    return {
        ...globalConfig,
        model: resolveModelForCapability(globalConfig, node.metadata?.model, mode),
        reasoningEffort: node.metadata?.reasoningEffort || globalConfig.reasoningEffort || defaultConfig.reasoningEffort,
        quality: node.metadata?.quality || globalConfig.quality || defaultConfig.quality,
        size: mode === "video" ? node.metadata?.size || defaultVideoSize : node.metadata?.size || globalConfig.size || defaultConfig.size,
        videoSize: mode === "video" ? node.metadata?.size || defaultVideoSize : defaultVideoSize,
        background: node.metadata?.background ?? globalConfig.background ?? defaultConfig.background,
        videoSeconds: node.metadata?.seconds || globalConfig.videoSeconds || defaultConfig.videoSeconds,
        vquality: node.metadata?.vquality || globalConfig.vquality || defaultConfig.vquality,
        videoGenerateAudio: node.metadata?.generateAudio || globalConfig.videoGenerateAudio || defaultConfig.videoGenerateAudio,
        videoWatermark: node.metadata?.watermark || globalConfig.videoWatermark || defaultConfig.videoWatermark,
        videoSeed: node.metadata?.seed ?? globalConfig.videoSeed ?? defaultConfig.videoSeed,
        audioVoice: node.metadata?.audioVoice ?? globalConfig.audioVoice ?? defaultConfig.audioVoice,
        audioFormat: node.metadata?.audioFormat || globalConfig.audioFormat || defaultConfig.audioFormat,
        audioSpeed: node.metadata?.audioSpeed || globalConfig.audioSpeed || defaultConfig.audioSpeed,
        audioInstructions: node.metadata?.audioInstructions ?? globalConfig.audioInstructions ?? defaultConfig.audioInstructions,
        audioPitch: node.metadata?.audioPitch ?? globalConfig.audioPitch ?? defaultConfig.audioPitch,
        audioVolume: node.metadata?.audioVolume ?? globalConfig.audioVolume ?? defaultConfig.audioVolume,
        audioSubtitle: node.metadata?.audioSubtitle ?? globalConfig.audioSubtitle ?? defaultConfig.audioSubtitle,
        count: String(node.metadata?.count || (mode === "image" ? globalConfig.canvasImageCount || globalConfig.count : globalConfig.count) || defaultConfig.count),
    };
}

function promptPlaceholder(mode: CanvasNodeGenerationMode, hasImageContent: boolean, hasTextContent: boolean) {
    if (mode === "video") return "首行可写风格描述，下方描述要生成的视频内容";
    if (mode === "audio") return "描述要生成的音频内容";
    if (mode === "image") return hasImageContent ? "首行可写风格描述，下方描述要把这张图修改成什么" : "首行可写风格描述，下方描述要生成的图片内容";
    return hasTextContent ? "请输入你想要将本段文本修改成什么" : "请输入你想要生成的文本内容";
}

function videoConfigPatch(key: keyof AiConfig, value: string) {
    if (key === "videoSeconds") return { seconds: value };
    if (key === "videoGenerateAudio") return { generateAudio: value };
    if (key === "videoWatermark") return { watermark: value };
    if (key === "videoSeed") return { seed: value };
    return { [key]: value };
}
