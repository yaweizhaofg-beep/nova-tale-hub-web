import type { CSSProperties } from "react";
import { LoaderCircle, Play, Settings2, Square } from "canvas-lucide";
import { Button, Segmented } from "antd";

import { ModelPicker } from "@canvas/components/model-picker";
import { RoutePicker } from "@canvas/components/route-picker";
import { defaultConfig, resolveModelForCapability, useConfigStore, useEffectiveConfig, type AiConfig } from "@canvas/stores/use-config-store";
import { modelChangeMetadataPatch } from "@canvas/services/api/platform-models";
import { canvasNodeColor, canvasThemes } from "@canvas/lib/canvas-theme";
import { useThemeStore } from "@canvas/stores/use-theme-store";
import { CanvasImageSettingsPopover } from "./canvas-image-settings-popover";
import { CanvasAudioSettingsPopover } from "./canvas-audio-settings-popover";
import { CanvasTextSettingsPopover } from "./canvas-text-settings-popover";
import { CanvasVideoSettingsPopover } from "./canvas-video-settings-popover";
import { CanvasNodeType, type CanvasGenerationMode, type CanvasNodeData, type CanvasNodeMetadata } from "@canvas/types/canvas";

const settingsButtonClass = "canvas-compact-control !h-8 !w-full !justify-start !rounded-lg !px-2";

type CanvasConfigNodePanelProps = {
    node: CanvasNodeData;
    isRunning: boolean;
    inputSummary: { textCount: number; imageCount: number; videoCount: number; audioCount: number };
    onConfigChange: (nodeId: string, patch: Partial<CanvasNodeMetadata>) => void;
    onGenerate: (nodeId: string) => void;
    onStop: (nodeId: string) => void;
    onComposerToggle: () => void;
};

export function CanvasConfigNodePanel({ node, isRunning, inputSummary, onConfigChange, onGenerate, onStop, onComposerToggle }: CanvasConfigNodePanelProps) {
    const globalConfig = useEffectiveConfig();
    const openConfigDialog = useConfigStore((state) => state.openConfigDialog);
    const theme = canvasThemes[useThemeStore((state) => state.theme)];
    const rawMode = node.metadata?.generationMode || "image";
    const mode: CanvasGenerationMode = rawMode === "video" ? "video" : rawMode === "text" ? "text" : rawMode === "audio" ? "audio" : "image";
    const config = buildNodeConfig(globalConfig, node, mode);
    const accent = canvasNodeColor(CanvasNodeType.Config, theme.node.activeStroke);
    const chipStyle = { background: theme.node.fill, borderColor: theme.node.stroke, color: theme.node.text };
    const hasAnyInput = Boolean(inputSummary.textCount || inputSummary.imageCount || inputSummary.videoCount || inputSummary.audioCount);
    const hasComposerContent = Boolean((node.metadata?.composerContent ?? node.metadata?.prompt ?? "").trim());
    const canGenerate = hasComposerContent || hasAnyInput;

    return (
        <div className="flex h-full w-full cursor-move flex-col gap-1.5 p-2 text-sm" style={{ color: theme.node.text }} onWheel={(event) => event.stopPropagation()}>
            <div className="thin-scrollbar min-h-0 flex-1 space-y-1.5 overflow-y-auto">
                <div className="cursor-default" onMouseDown={(event) => event.stopPropagation()}>
                    <Segmented
                        size="small"
                        block
                        aria-label="生成方式"
                        className="canvas-config-mode !rounded-md !p-0.5 [&_.ant-segmented-item-label]:!px-1"
                        value={mode}
                        onChange={(value) => onConfigChange(node.id, { generationMode: value as CanvasGenerationMode })}
                        options={[
                            { value: "audio", label: "音频" },
                            { value: "image", label: "生图" },
                            { value: "video", label: "视频" },
                            { value: "text", label: "文本" },
                        ]}
                    />
                </div>

                <div className="grid grid-cols-2 gap-1">
                    <InputChip label="提示词" value={`${inputSummary.textCount} 个`} style={chipStyle} />
                    <InputChip label="参考图" value={`${inputSummary.imageCount} 张`} style={chipStyle} />
                    <InputChip label="参考视频" value={`${inputSummary.videoCount} 个`} style={chipStyle} />
                    <InputChip label="参考音频" value={`${inputSummary.audioCount} 个`} style={chipStyle} />
                </div>
                <div className="grid min-w-0 cursor-default gap-1.5" onMouseDown={(event) => event.stopPropagation()}>
                    <div className={mode === "image" || mode === "video" ? "grid min-w-0 grid-cols-2 gap-1.5" : "min-w-0"}>
                        {mode === "image" || mode === "video" ? (
                            <RoutePicker capability={mode} className="canvas-compact-control h-8" fullWidth />
                        ) : null}
                        {mode === "audio" ? <span className="text-xs">火山音频 · 豆包音频生成 1.0</span> : <ModelPicker
                            className="canvas-compact-control h-8"
                            config={config}
                            value={config.model}
                            onChange={(model) => onConfigChange(node.id, modelChangeMetadataPatch(config, model))}
                            capability={mode}
                            onMissingConfig={() => openConfigDialog(true)}
                            fullWidth
                        />}
                    </div>
                    {mode === "video" ? (
                        <CanvasVideoSettingsPopover config={config} placement="topRight" buttonClassName={settingsButtonClass} onConfigChange={(key, value) => onConfigChange(node.id, videoConfigPatch(key, value))} />
                    ) : mode === "audio" ? (
                        <CanvasAudioSettingsPopover config={config} placement="topRight" onConfigChange={(key, value) => onConfigChange(node.id, { [key]: value })} />
                    ) : mode === "text" ? (
                        <CanvasTextSettingsPopover config={config} placement="topRight" buttonClassName={settingsButtonClass} onConfigChange={(key, value) => onConfigChange(node.id, { [key]: value })} />
                    ) : (
                        <CanvasImageSettingsPopover config={config} placement="topRight" autoAdjustOverflow={false} buttonClassName={settingsButtonClass} onConfigChange={(key, value) => onConfigChange(node.id, key === "count" ? { count: Number(value) || 1 } : { [key]: value })} />
                    )}
                </div>
            </div>

            <div className="grid shrink-0 grid-cols-[auto_minmax(0,1fr)] gap-1.5">
                <button type="button" className="inline-flex h-8 cursor-pointer items-center gap-1 rounded-md border px-2 text-[11px]" style={chipStyle} onMouseDown={(event) => event.stopPropagation()} onClick={onComposerToggle}>
                    <Settings2 className="size-3.5" />
                    组装提示词
                </button>
                <Button
                    type={isRunning ? "primary" : "default"}
                    className="!h-8 !w-full !rounded-md !px-1"
                    style={canGenerate && !isRunning ? { color: accent, background: accent + "18", borderColor: accent + "45" } : undefined}
                    danger={isRunning}
                    disabled={!isRunning && !canGenerate}
                    onMouseDown={(event) => event.stopPropagation()}
                    onClick={() => (isRunning ? onStop(node.id) : onGenerate(node.id))}
                >
                    <span className="inline-flex items-center gap-1.5">
                        {isRunning ? (
                            <>
                                <LoaderCircle className="size-4 animate-spin" />
                                <Square className="size-3.5 fill-current" />
                                <span>停止</span>
                            </>
                        ) : (
                            <>
                                <Play className="size-4" />
                                <span>开始生成</span>
                            </>
                        )}
                    </span>
                </Button>
            </div>
        </div>
    );
}

function InputChip({ label, value, style }: { label: string; value: string; style: CSSProperties }) {
    return (
        <span className="inline-flex h-6 items-center justify-between gap-1 rounded-md border px-1.5 text-[11px]" style={style}>
            <span className="opacity-70">{label}</span>
            <span className="font-medium">{value}</span>
        </span>
    );
}

function buildNodeConfig(globalConfig: AiConfig, node: CanvasNodeData, mode: CanvasGenerationMode): AiConfig {
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
        audioVoice: node.metadata?.audioVoice ?? globalConfig.audioVoice,
        audioFormat: node.metadata?.audioFormat ?? globalConfig.audioFormat,
        audioSpeed: node.metadata?.audioSpeed ?? globalConfig.audioSpeed,
        audioInstructions: node.metadata?.audioInstructions ?? globalConfig.audioInstructions,
        audioPitch: node.metadata?.audioPitch ?? globalConfig.audioPitch,
        audioVolume: node.metadata?.audioVolume ?? globalConfig.audioVolume,
        audioSubtitle: node.metadata?.audioSubtitle ?? globalConfig.audioSubtitle,
        count: String(node.metadata?.count || (mode === "image" ? globalConfig.canvasImageCount || globalConfig.count : globalConfig.count) || defaultConfig.count),
    };
}

function videoConfigPatch(key: keyof AiConfig, value: string) {
    if (key === "videoSeconds") return { seconds: value };
    if (key === "videoGenerateAudio") return { generateAudio: value };
    if (key === "videoWatermark") return { watermark: value };
    if (key === "videoSeed") return { seed: value };
    return { [key]: value };
}
