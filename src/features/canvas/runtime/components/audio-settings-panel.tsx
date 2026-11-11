import { useEffect, useState } from "react";
import { Select, InputNumber, Switch } from "antd";
import { ImageSettingsTheme } from "@canvas/components/image-settings-panel";
import { CanvasAudioHistory } from "@canvas/components/canvas/canvas-audio-history";
import { audioFormatOptions, normalizeAudioFormatValue, selectedAudioSpeakers } from "@canvas/lib/audio-generation";
import { fetchAudioModels, fetchAudioVoices, type AudioModel, type AudioVoice } from "@canvas/services/api/audio";
import type { CanvasTheme } from "@canvas/lib/canvas-theme";
import type { AiConfig } from "@canvas/stores/use-config-store";

export type AudioSettingKey = "audioVoice" | "audioFormat" | "audioSpeed" | "audioInstructions" | "audioPitch" | "audioVolume" | "audioSubtitle";
type Props = { config: AiConfig; onConfigChange: (key: AudioSettingKey, value: string) => void; theme: CanvasTheme; showTitle?: boolean; className?: string };
export function AudioSettingsPanel({ config, onConfigChange, theme, showTitle = true, className = "w-[320px] space-y-4" }: Props) {
    const [voices, setVoices] = useState<AudioVoice[]>([]);
    const [model, setModel] = useState<AudioModel>();
    const [error, setError] = useState("");
    const speakers = selectedAudioSpeakers(config.audioVoice);
    useEffect(() => {
        let disposed = false;
        Promise.all([fetchAudioModels(), fetchAudioVoices()]).then(([models, list]) => {
            if (!disposed) { setModel(models.find(m => m.model_key === "seed-audio-1.0")); setVoices(list); }
        }).catch(() => { if (!disposed) setError("读取音频配置失败，请检查登录状态或联系管理员"); });
        return () => { disposed = true; };
    }, []);
    const popup = (trigger: HTMLElement) => trigger.parentElement!;
    return <ImageSettingsTheme theme={theme}><div className={className} style={{ color: theme.node.text }} onMouseDown={e => e.stopPropagation()}>
        {showTitle && <div className="font-semibold">火山音频 · 豆包音频生成 1.0</div>}
        <div className="text-xs leading-5" style={{ color: theme.node.muted }}>
            {error || (model ? model.configured ? `售价 ${model.sell_per_minute} 积分/分钟 · 本次预扣 ${model.reserve_points} 积分` : "当前公司尚未配置火山音频 Key" : "正在读取价格…")}<br />
            按原始音频秒数结算，多退少补；语速调整不改变计费时长。单条最长 2 分钟。
        </div>
        <div className="space-y-2"><div className="text-xs">音色（不选时自动；按顺序为声音参考，最多 3 个）</div>
            <Select mode="multiple" allowClear showSearch optionFilterProp="label" maxCount={3} className="w-full" getPopupContainer={popup}
                value={speakers} placeholder="搜索名称或音色 ID" onChange={v => onConfigChange("audioVoice", JSON.stringify(v))}
                options={voices.map(v => ({ value: v.speaker_id, label: `${v.name} · ${v.speaker_id}` }))} />
            {!voices.length && !error && <div className="text-xs opacity-70">暂无可用音色，可先自动生成，或由管理员同步官方音色／登记已有音色 ID。</div>}
            {voices.filter(v => speakers.includes(v.speaker_id) && v.trial_url).map(v => <div key={v.speaker_id} className="text-xs">{v.name}<audio className="mt-1 h-8 w-full" controls preload="none" src={v.trial_url} /></div>)}
        </div>
        <div className="text-xs leading-5 opacity-70">无参考：文本生成；连接 1 张图片：图片生成；连接音频或选择音色：参考声音生成。图片不可与声音混用。音频与音色合计最多 3 个，音频每条 ≤30 秒、≤10 MB。提示词可用 @音频1、@音频2 指定声音，连接音频在前、音色在后。</div>
        <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1 text-xs"><div>格式</div><Select className="w-full" getPopupContainer={popup} value={normalizeAudioFormatValue(config.audioFormat)} options={audioFormatOptions} onChange={v => onConfigChange("audioFormat", v)} /></label>
            <label className="space-y-1 text-xs"><div>语速（0.5～2）</div><InputNumber className="!w-full" min={0.5} max={2} step={0.05} value={Number(config.audioSpeed || 1)} onChange={v => onConfigChange("audioSpeed", String(v ?? 1))} /></label>
            <label className="space-y-1 text-xs"><div>音量（-50～100）</div><InputNumber className="!w-full" min={-50} max={100} value={Number(config.audioVolume || 0)} onChange={v => onConfigChange("audioVolume", String(v ?? 0))} /></label>
            <label className="space-y-1 text-xs"><div>音高（-12～12）</div><InputNumber className="!w-full" min={-12} max={12} value={Number(config.audioPitch || 0)} onChange={v => onConfigChange("audioPitch", String(v ?? 0))} /></label>
        </div>
        <label className="flex items-center gap-2 text-xs"><Switch size="small" checked={config.audioSubtitle !== "false"} onChange={v => onConfigChange("audioSubtitle", String(v))} />生成字幕</label>
        <textarea value={config.audioInstructions || ""} maxLength={3000} placeholder="声音指令，例如：自然、温暖、适合旁白" className="h-16 w-full resize-none rounded border bg-transparent p-2 text-sm" style={{ borderColor: theme.node.stroke }} onChange={e => onConfigChange("audioInstructions", e.target.value)} />
        <CanvasAudioHistory />
    </div></ImageSettingsTheme>;
}
