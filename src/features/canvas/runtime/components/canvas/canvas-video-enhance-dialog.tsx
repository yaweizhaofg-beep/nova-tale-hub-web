import { useEffect, useState, type ReactNode } from "react";
import { Button, Modal, Select } from "antd";
import { Sparkles } from "canvas-lucide";

import {
  VIDEO_UPSCALE_FPS_OPTIONS,
  VIDEO_UPSCALE_RESOLUTIONS,
  defaultVideoUpscaleParams,
  quoteVideoUpscale,
  type VideoUpscaleParams,
} from "@canvas/lib/canvas/video-upscale";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div>
        <div className="font-medium opacity-75">{label}</div>
        <p className="mt-0.5 text-xs leading-relaxed opacity-50">{hint}</p>
      </div>
      {children}
    </div>
  );
}

function fpsSelectValue(targetFps: number | null | undefined) {
  if (targetFps == null || !Number.isFinite(targetFps)) return "";
  return String(Math.round(targetFps));
}

export function CanvasVideoEnhanceDialog({
  videoUrl,
  durationMs,
  sourceWidth,
  sourceHeight,
  open,
  onClose,
  onConfirm,
}: {
  videoUrl: string;
  durationMs?: number | null;
  sourceWidth?: number | null;
  sourceHeight?: number | null;
  open: boolean;
  onClose: () => void;
  onConfirm: (params: VideoUpscaleParams) => void;
}) {
  const [params, setParams] = useState<VideoUpscaleParams>(defaultVideoUpscaleParams);
  const [quoteText, setQuoteText] = useState<string>("");

  useEffect(() => {
    if (!open) return;
    setParams(defaultVideoUpscaleParams);
    setQuoteText("");
  }, [open, videoUrl]);

  useEffect(() => {
    if (!open || !videoUrl) return;
    let cancelled = false;
    setQuoteText("估算积分中…");
    void quoteVideoUpscale({ videoUrl, durationMs, sourceWidth, sourceHeight, params })
      .then((q) => {
        if (cancelled) return;
        const sec = q.durationSeconds != null ? Number(q.durationSeconds).toFixed(2) : "—";
        const pts = q.reservedPoints != null ? Number(q.reservedPoints).toFixed(4) : "—";
        const fpsLabel =
          params.targetFps != null && Number.isFinite(params.targetFps)
            ? `${Math.round(params.targetFps)} fps`
            : "跟随原片";
        setQuoteText(`预估约 ${sec} 秒 · ${params.resolution} · ${fpsLabel}，预扣约 ${pts} 积分（完成后按实际输出时长结算）`);
      })
      .catch(() => {
        if (!cancelled) setQuoteText("暂无法估算积分（仍可提交，以服务端校验为准）");
      });
    return () => {
      cancelled = true;
    };
  }, [open, videoUrl, durationMs, sourceWidth, sourceHeight, params]);

  return (
    <Modal title={null} open={open && Boolean(videoUrl)} onCancel={onClose} footer={null} width={640} centered destroyOnHidden>
      <div className="space-y-5">
        <div>
          <h2 className="text-xl font-semibold">画质增强</h2>
          <p className="mt-1 text-sm opacity-60">
            调用火山 MediaKit 画质增强（大模型版），完成后自动转码；成功后在右侧生成新视频节点。按时长预扣积分，完成后多退少补。
          </p>
        </div>
        <div className="rounded-xl border p-3">
          <video src={videoUrl} controls playsInline className="max-h-[240px] w-full rounded-lg bg-black object-contain" />
        </div>
        <Field
          label="目标分辨率"
          hint="输出清晰度：720p / 1080p / 2k。越高越清晰、越贵；输入片源最高约 1080p。"
        >
          <Select
            className="w-full"
            value={params.resolution}
            options={VIDEO_UPSCALE_RESOLUTIONS.map((value) => ({ value, label: value }))}
            onChange={(resolution) =>
              setParams((current) => ({ ...current, resolution: resolution as VideoUpscaleParams["resolution"] }))
            }
          />
        </Field>
        <Field
          label="输出帧率"
          hint="跟随原片最省；30 / 60 / 120 会按官方帧率档加价（60 约 ×2，120 约 ×4）。"
        >
          <Select
            className="w-full"
            value={fpsSelectValue(params.targetFps)}
            options={VIDEO_UPSCALE_FPS_OPTIONS.map((item) => ({ value: item.value, label: item.label }))}
            onChange={(v) =>
              setParams((current) => ({
                ...current,
                targetFps: v ? Number(v) : null,
              }))
            }
          />
        </Field>
        {quoteText ? <div className="text-sm opacity-65">{quoteText}</div> : null}
        <div className="flex justify-end">
          <Button type="primary" size="large" icon={<Sparkles className="size-4" />} onClick={() => onConfirm(params)}>
            开始增强
          </Button>
        </div>
      </div>
    </Modal>
  );
}
