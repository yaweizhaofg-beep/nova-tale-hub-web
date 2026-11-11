import { useState } from "react";
import { App, Button, Modal } from "antd";
import { AudioTask, audioStatusLabels, fetchAudioHistory, RESTORE_AUDIO_EVENT } from "@canvas/services/api/audio";

export function CanvasAudioHistory() {
    const [open, setOpen] = useState(false);
    const [rows, setRows] = useState<AudioTask[]>([]);
    const [page, setPage] = useState(0);
    const [loading, setLoading] = useState(false);
    const { message } = App.useApp();
    async function load(next: number) {
        setLoading(true);
        try { setRows(await fetchAudioHistory(next)); setPage(next); }
        catch { message.error("读取音频历史失败"); }
        finally { setLoading(false); }
    }
    return <>
        <Button type="text" size="small" onClick={() => { setOpen(true); void load(0); }}>音频历史</Button>
        {/* 音频设置浮层使用 1200，历史弹窗及遮罩必须显示在其上方。 */}
        <Modal rootClassName="canvas-audio-history-modal" zIndex={1300} title="我的音频生成记录" open={open} onCancel={() => setOpen(false)} footer={null} width={680} centered>
            <p className="mb-3 text-xs opacity-75">平台会保留生成记录，结果可添加到当前画布。</p>
            <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-background p-2 text-xs">
                <Button type="text" loading={loading} onClick={() => void load(page)}>刷新</Button>
                <Button type="text" disabled={!page || loading} onClick={() => void load(page - 1)}>上一页</Button>
                <span>第 {page + 1} 页</span>
                <Button type="text" disabled={rows.length < 30 || loading} onClick={() => void load(page + 1)}>下一页</Button>
            </div>
            <div className="thin-scrollbar max-h-[52dvh] space-y-2 overflow-y-auto pr-1">
                {!rows.length && !loading && <p className="!m-0 rounded-xl border border-dashed border-border bg-background p-6 text-center text-xs opacity-75">暂无音频任务</p>}
                {rows.map(task => <div key={task.id} className="space-y-2 rounded-xl border border-border bg-background p-3">
                    <div className="flex justify-between gap-3 text-xs"><span>{audioStatusLabels[task.status] || task.status}</span><span>{task.created_at}</span></div>
                    <p className="!m-0 line-clamp-3 whitespace-pre-wrap [overflow-wrap:anywhere]">{readTaskPrompt(task.request_json)}</p>
                    <p className="text-xs opacity-70">{task.status === "SUCCEEDED" ? `原始时长 ${task.original_duration} 秒 · 实扣 ${task.actual_points} 积分` : task.status === "FAILED" ? "预扣已退还" : `预扣 ${task.reserved_points} 积分，完成后按原始时长结算`}</p>
                    {task.error_message && <p className="text-xs">{task.error_message}</p>}
                    {task.audio_url && <audio className="h-9 w-full" controls preload="none" src={task.audio_url} />}
                    {task.status !== "FAILED" && <Button type="text" size="small" onClick={() => { window.dispatchEvent(new CustomEvent(RESTORE_AUDIO_EVENT, { detail: task })); setOpen(false); }}>添加到当前画布</Button>}
                    {task.audio_url && <a className="ml-3 text-xs" href={task.audio_url} target="_blank" rel="noreferrer">打开／下载音频</a>}
                    {task.subtitle_json && <Button type="text" size="small" onClick={() => {
                        const url = URL.createObjectURL(new Blob([task.subtitle_json!], { type: "application/json" }));
                        const link = document.createElement("a"); link.href = url; link.download = `${task.id}-subtitle.json`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
                    }}>下载字幕 JSON</Button>}
                </div>)}
            </div>
        </Modal>
    </>;
}

function readTaskPrompt(request: string) {
    try {
        const prompt = JSON.parse(request)?.text_prompt;
        return typeof prompt === "string" ? prompt : "";
    } catch {
        return "";
    }
}
