import type { ReferenceImage } from "@canvas/types/image";

export function imageReferenceLabel(index: number) {
    return `图片${index + 1}`;
}

/** 提示词 chip / 素材条上展示的紧凑编号（图片 → 图1） */
export function referenceChipDisplayLabel(label: string) {
    const match = /^(图片|视频|音频)(\d+)$/.exec(label);
    if (!match) return label;
    if (match[1] === "图片") return `图${match[2]}`;
    return `${match[1]}${match[2]}`;
}

export function buildImageReferencePromptText(prompt: string, references: ReferenceImage[]) {
    const text = prompt.trim();
    if (!references.length) return text;
    const labels = references.map((_, index) => imageReferenceLabel(index));
    return `参考图片编号：${labels.join("、")}。请按这些编号理解提示词中的图片引用。\n\n${text}`;
}
