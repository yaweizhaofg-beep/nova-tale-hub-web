import { colors } from "@/shared";
import { CanvasNodeType, type CanvasNodeTypeId } from "@canvas/types/canvas";

export type CanvasColorTheme = "light" | "dark";
export type CanvasBackgroundMode = "dots" | "lines" | "blank";

export const canvasNodeColors = {
    [CanvasNodeType.Text]: "#f59e0b",
    [CanvasNodeType.Image]: "#22d3ee",
    [CanvasNodeType.Video]: "#34d399",
    [CanvasNodeType.Audio]: "#f472b6",
    [CanvasNodeType.Config]: "#a78bfa",
    [CanvasNodeType.Group]: "#94a3b8",
} as const;

export function canvasNodeColor(type: CanvasNodeTypeId, fallback: string) {
    return Object.prototype.hasOwnProperty.call(canvasNodeColors, type) ? canvasNodeColors[type as CanvasNodeType] : fallback;
}

export const canvasNodeStatus = {
    success: { label: "完成", color: colors.success },
    loading: { label: "生成中", color: colors.warning },
    error: { label: "失败", color: colors.error },
} as const;

export const canvasFontFamily = '"Helvetica Neue", "PingFang SC", "Microsoft YaHei", sans-serif';

export const canvasThemes = {
    light: {
        canvas: {
            background: "#f4f2ed",
            dot: "rgba(68,64,60,.28)",
            line: "rgba(68,64,60,.12)",
            selectionStroke: "#1c1917",
            selectionFill: "rgba(28,25,23,.06)",
        },
        node: {
            label: "#57534e",
            fill: "#e7e5df",
            panel: "#fbfaf7",
            stroke: "#d6d3ca",
            activeStroke: "#1c1917",
            placeholder: "#8a8479",
            text: "#292524",
            muted: "#78716c",
            faint: "#a8a29e",
        },
        toolbar: {
            panel: "rgba(251,250,247,.96)",
            border: "#d6d3ca",
            item: "#57534e",
            itemHover: "#e7e5df",
            activeBg: "#e7e5df",
            activeText: "#292524",
        },
    },
    dark: {
        canvas: {
            background: colors.bgPrimary,
            dot: colors.borderStrong,
            line: colors.border,
            selectionStroke: colors.accent,
            selectionFill: colors.bgActive,
        },
        node: {
            label: colors.textSecondary,
            fill: colors.bgSurface,
            panel: colors.bgSecondary,
            stroke: colors.borderStrong,
            activeStroke: colors.accent,
            placeholder: colors.textMuted,
            text: colors.textPrimary,
            muted: colors.textSecondary,
            faint: colors.textMuted,
        },
        toolbar: {
            panel: colors.bgSecondary,
            border: colors.borderStrong,
            item: colors.textSecondary,
            itemHover: colors.bgHover,
            activeBg: colors.bgActive,
            activeText: colors.accent,
        },
    },
} as const;

export type CanvasTheme = (typeof canvasThemes)[CanvasColorTheme];
