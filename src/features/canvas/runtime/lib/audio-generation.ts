export const audioFormatOptions = [{ value: "mp3", label: "MP3" }, { value: "wav", label: "WAV" }, { value: "ogg_opus", label: "Ogg Opus" }];
export function selectedAudioSpeakers(value = ""): string[] {
    if (!value || ["alloy", "ash", "ballad", "coral", "echo", "fable", "nova", "onyx", "sage", "shimmer", "verse", "marin", "cedar"].includes(value)) return [];
    try { const list: unknown = JSON.parse(value); return Array.isArray(list) ? list.filter((v): v is string => typeof v === "string" && !!v.trim()) : [value]; }
    catch { return [value]; }
}
export function normalizeAudioVoiceValue(value: string) { return JSON.stringify(selectedAudioSpeakers(value)); }
export function normalizeAudioFormatValue(value: string) { return audioFormatOptions.some((item) => item.value === value) ? value : "mp3"; }
export function normalizeAudioSpeedValue(value: string) { const speed = Number(value); return String(Number.isFinite(speed) ? Math.max(0.5, Math.min(2, Number(speed.toFixed(2)))) : 1); }
export function audioVoiceLabel(value: string) { const count = selectedAudioSpeakers(value).length; return count ? `${count} 个音色` : "自动音色"; }
export function audioFormatLabel(value: string) { return audioFormatOptions.find((item) => item.value === normalizeAudioFormatValue(value))?.label || "MP3"; }
export function audioSpeedLabel(value: string) { return `${normalizeAudioSpeedValue(value)}x`; }
export function audioMimeType(format: string) { return format === "wav" ? "audio/wav" : format === "ogg_opus" ? "audio/ogg" : "audio/mpeg"; }
