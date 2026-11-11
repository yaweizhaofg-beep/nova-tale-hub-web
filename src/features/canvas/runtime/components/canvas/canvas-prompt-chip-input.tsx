import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import type { CSSProperties, ClipboardEvent, KeyboardEvent, MouseEvent, PointerEvent } from "react";
import { createPortal } from "react-dom";
import { Image } from "antd";
import { FileText, Image as ImageIcon, Music2, Video } from "canvas-lucide";

import { referenceChipDisplayLabel } from "@canvas/lib/image-reference-prompt";
import { bindOssThumb, OSS_THUMB_WIDTH, ossVideoPoster, OssThumbImage, OssVideoPoster } from "@canvas/lib/platform/oss-image";
import { canvasThemes } from "@canvas/lib/canvas-theme";
import { isImeComposing, isShiftEnterKey } from "@canvas/lib/keyboard-event";
import { useThemeStore } from "@canvas/stores/use-theme-store";
import type { CanvasResourceReference } from "@canvas/lib/canvas/canvas-resource-references";

type Props = {
    value: string;
    references: CanvasResourceReference[];
    onChange: (value: string) => void;
    onSubmit?: () => void;
    className?: string;
    style?: CSSProperties;
    placeholder?: string;
};

export type CanvasPromptChipInputHandle = {
    insertReference: (reference: CanvasResourceReference) => void;
};

type MentionState = {
    query: string;
    rect: DOMRect | null;
};

type Token =
    | { type: "text"; value: string }
    | { type: "reference"; label: string };

// 提示词面板专用的 contentEditable 输入框：@ 引用时在文本内嵌缩略图 + 编号 chip（如「图1」），序列化仍为完整 label（如「图片1」）。
export const CanvasPromptChipInput = forwardRef<CanvasPromptChipInputHandle, Props>(function CanvasPromptChipInput({ value, references, onChange, onSubmit, className, style, placeholder }, ref) {
    const theme = canvasThemes[useThemeStore((state) => state.theme)];
    const editorRef = useRef<HTMLDivElement>(null);
    const composingRef = useRef(false);
    // 记录我们最近一次向父级 emit 的 value。聚焦时若 value 与它一致,说明是本组件输入的回声,
    // 跳过重建以免打断光标 / IME;若不一致(如发送后父级把 prompt 清空),即使聚焦也要重建。
    const lastEmittedRef = useRef(value);
    const [mention, setMention] = useState<MentionState | null>(null);
    const [activeIndex, setActiveIndex] = useState(0);
    const [imagePreview, setImagePreview] = useState<string | null>(null);

    const activeReferences = useMemo(() => references.filter((item) => item.active), [references]);
    const referenceByLabel = useMemo(() => new Map(activeReferences.map((item) => [item.label, item])), [activeReferences]);
    // 长 label 优先匹配,避免「图片1」把「图片10」切坏。
    const activeLabels = useMemo(() => Array.from(new Set(activeReferences.map((item) => item.label))).sort((a, b) => b.length - a.length), [activeReferences]);
    const tokens = useMemo(() => parseTokens(value, activeLabels), [value, activeLabels]);

    const candidates = useMemo(() => {
        if (!mention) return [];
        const query = mention.query.trim().toLowerCase();
        if (!query) return activeReferences;
        return activeReferences.filter((item) => `${item.label} ${item.title} ${item.kind} ${item.text || ""}`.toLowerCase().includes(query));
    }, [mention, activeReferences]);

    // DOM ← value:未聚焦时按 value 重建;聚焦时仅当 value 是外部改动(非本组件回声)才重建。
    useEffect(() => {
        const editor = editorRef.current;
        if (!editor) return;
        if (document.activeElement === editor && value === lastEmittedRef.current) return;
        const scrollTop = editor.scrollTop;
        const frag = document.createDocumentFragment();
        tokens.forEach((token) => {
            if (token.type === "text") {
                appendPlainText(frag, token.value);
                return;
            }
            const reference = referenceByLabel.get(token.label);
            if (reference) frag.append(createReferenceChip(reference, theme, setImagePreview));
            else appendPlainText(frag, token.label);
        });
        editor.replaceChildren(frag);
        editor.scrollTop = scrollTop;
        lastEmittedRef.current = value;
    }, [tokens, referenceByLabel, theme, value]);

    const emit = (next: string) => {
        lastEmittedRef.current = next;
        onChange(next);
    };

    const syncFromEditor = () => {
        const editor = editorRef.current;
        if (!editor) return;
        emit(serializeEditor(editor));
        syncMention();
    };

    const syncMention = () => {
        const text = textBeforeCaret();
        const match = /@([^\s@]*)$/.exec(text);
        if (!match || !activeReferences.length) {
            closeMention();
            return;
        }
        setMention({ query: match[1] || "", rect: caretRect() });
        setActiveIndex(0);
    };

    const closeMention = () => {
        setMention(null);
        setActiveIndex(0);
    };

    const insertReference = (reference: CanvasResourceReference) => {
        const editor = editorRef.current;
        if (!editor) return;
        removeActiveMention();
        editor.focus();
        const chip = createReferenceChip(reference, theme, setImagePreview);
        const space = document.createTextNode(" ");
        const selection = window.getSelection();
        const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
        const rangeInEditor = Boolean(range && editor.contains(range.commonAncestorContainer));
        if (range && rangeInEditor) {
            range.insertNode(space);
            range.insertNode(chip);
            range.setStartAfter(space);
            range.collapse(true);
            selection?.removeAllRanges();
            selection?.addRange(range);
        } else {
            editor.append(chip, space);
            placeCaretAtEnd(editor);
        }
        closeMention();
        emit(serializeEditor(editor));
    };

    useImperativeHandle(ref, () => ({ insertReference }));

    const showPlaceholder = !value.trim();

    return (
        <div className="relative w-full">
            {showPlaceholder && placeholder ? (
                <div className="pointer-events-none absolute left-3 top-2 text-sm leading-5" style={{ color: theme.node.placeholder }}>
                    {placeholder}
                </div>
            ) : null}
            <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                role="textbox"
                aria-multiline="true"
                className={`${className || ""} overflow-y-auto whitespace-pre-wrap break-words outline-none`}
                style={{ ...style, cursor: "text" }}
                onInput={() => {
                    if (!composingRef.current) syncFromEditor();
                }}
                onCompositionStart={() => {
                    composingRef.current = true;
                }}
                onCompositionEnd={() => {
                    composingRef.current = false;
                    syncFromEditor();
                }}
                onPaste={(event: ClipboardEvent<HTMLDivElement>) => {
                    // 只粘贴纯文本，去掉来源页的黑/白字色等 HTML 样式
                    event.preventDefault();
                    event.stopPropagation();
                    const text = event.clipboardData.getData("text/plain");
                    if (!text) return;
                    document.execCommand("insertText", false, text);
                    syncFromEditor();
                }}
                onKeyDown={(event: KeyboardEvent<HTMLDivElement>) => {
                    event.stopPropagation();
                    if (isImeComposing(event)) return;
                    if (mention && candidates.length) {
                        if (event.key === "ArrowDown") {
                            event.preventDefault();
                            setActiveIndex((index) => (index + 1) % candidates.length);
                            return;
                        }
                        if (event.key === "ArrowUp") {
                            event.preventDefault();
                            setActiveIndex((index) => (index - 1 + candidates.length) % candidates.length);
                            return;
                        }
                        if (event.key === "Enter") {
                            event.preventDefault();
                            insertReference(candidates[Math.min(activeIndex, candidates.length - 1)]);
                            return;
                        }
                        if (event.key === "Escape") {
                            event.preventDefault();
                            closeMention();
                            return;
                        }
                    }
                    if ((event.key === "Backspace" || event.key === "Delete") && deleteAdjacentReference(event.key)) {
                        event.preventDefault();
                        requestAnimationFrame(syncFromEditor);
                        return;
                    }
                    if (isShiftEnterKey(event) && onSubmit) {
                        event.preventDefault();
                        onSubmit();
                        return;
                    }
                    requestAnimationFrame(syncMention);
                }}
                onBlur={() => window.setTimeout(closeMention, 120)}
            />
            {mention && candidates.length ? (
                <MentionMenu rect={mention.rect} references={candidates} activeIndex={Math.min(activeIndex, candidates.length - 1)} theme={theme} onSelect={insertReference} />
            ) : null}
            {imagePreview ? <Image src={imagePreview} alt="引用图片预览" style={{ display: "none" }} preview={{ visible: true, src: imagePreview, onVisibleChange: (visible) => !visible && setImagePreview(null) }} /> : null}
        </div>
    );
});

function MentionMenu({ rect, references, activeIndex, theme, onSelect }: { rect: DOMRect | null; references: CanvasResourceReference[]; activeIndex: number; theme: (typeof canvasThemes)[keyof typeof canvasThemes]; onSelect: (reference: CanvasResourceReference) => void }) {
    const selectedRef = useRef(false);
    const activeItemRef = useRef<HTMLButtonElement | null>(null);

    useEffect(() => {
        activeItemRef.current?.scrollIntoView({ block: "nearest" });
    }, [activeIndex, references]);

    const selectReference = (reference: CanvasResourceReference) => {
        if (selectedRef.current) return;
        selectedRef.current = true;
        onSelect(reference);
    };

    const stopCanvasInteraction = (event: PointerEvent | MouseEvent) => event.stopPropagation();

    const menuWidth = 256;
    const maxMenuHeight = 224;
    const gap = 6;
    const anchor = rect || new DOMRect(16, 16, 0, 0);
    const left = clamp(anchor.left, 8, window.innerWidth - menuWidth - 8);
    const showAbove = anchor.bottom + gap + maxMenuHeight > window.innerHeight && anchor.top - gap - maxMenuHeight >= 0;
    const top = showAbove ? anchor.top - gap - maxMenuHeight : anchor.bottom + gap;

    return createPortal(
        <div
            data-canvas-resource-mention-menu="true"
            className="fixed z-[1200] max-h-56 w-64 overflow-y-auto rounded-xl border p-1 shadow-2xl backdrop-blur-md"
            style={{ left, top, background: theme.toolbar.panel, borderColor: theme.toolbar.border, color: theme.node.text }}
            onPointerDown={stopCanvasInteraction}
            onMouseDown={stopCanvasInteraction}
            onClick={(event) => event.stopPropagation()}
        >
            {references.map((reference, index) => (
                <button
                    key={reference.id}
                    ref={index === activeIndex ? activeItemRef : undefined}
                    type="button"
                    className="flex w-full min-w-0 items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition"
                    style={{ background: index === activeIndex ? theme.toolbar.activeBg : "transparent", color: index === activeIndex ? theme.toolbar.activeText : theme.node.text }}
                    onPointerDown={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        selectReference(reference);
                    }}
                    onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        selectReference(reference);
                    }}
                >
                    <ReferencePreview reference={reference} />
                    <span className="min-w-0 flex-1">
                        <span className="block font-medium">{referenceChipDisplayLabel(reference.label)}</span>
                        <span className="block truncate opacity-65">{reference.text || reference.title}</span>
                    </span>
                </button>
            ))}
        </div>,
        document.body,
    );
}

function ReferencePreview({ reference }: { reference: CanvasResourceReference }) {
    if (reference.kind === "image" && reference.previewUrl) return <OssThumbImage src={reference.previewUrl} maxWidth={OSS_THUMB_WIDTH} alt="" className="size-9 rounded-md object-cover" />;
    if (reference.kind === "video" && reference.previewUrl) return <OssVideoPoster url={reference.previewUrl} maxWidth={OSS_THUMB_WIDTH} className="size-9 rounded-md object-cover" fallback={<Video className="size-4" />} />;
    const Icon = reference.kind === "audio" ? Music2 : reference.kind === "video" ? Video : reference.kind === "image" ? ImageIcon : FileText;
    return (
        <span className="grid size-9 shrink-0 place-items-center rounded-md bg-black/10">
            <Icon className="size-4" />
        </span>
    );
}

function createReferenceChip(reference: CanvasResourceReference, theme: (typeof canvasThemes)[keyof typeof canvasThemes], onImagePreview: (url: string) => void) {
    const wrapper = document.createElement("span");
    wrapper.contentEditable = "false";
    wrapper.dataset.refLabel = reference.label;
    wrapper.className = "mx-0.5 inline-flex h-6 max-w-[7.5rem] items-center gap-0.5 overflow-hidden rounded-md border px-0.5 align-baseline";
    Object.assign(wrapper.style, { background: theme.toolbar.panel, borderColor: theme.node.stroke, color: theme.node.text } as CSSProperties);
    wrapper.title = `${reference.label}${reference.text || reference.title ? ` · ${reference.text || reference.title}` : ""}`;

    if (reference.kind === "image" && reference.previewUrl) {
        const image = document.createElement("img");
        bindOssThumb(image, reference.previewUrl, OSS_THUMB_WIDTH);
        image.alt = reference.title;
        image.draggable = false;
        image.className = "size-5 shrink-0 rounded-sm object-cover";
        wrapper.appendChild(image);
        wrapper.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            onImagePreview(reference.previewUrl || "");
        });
    } else if (reference.kind === "video" && reference.previewUrl) {
        appendVideoThumb(wrapper, reference.previewUrl);
    } else {
        const badge = document.createElement("span");
        badge.className = "grid size-5 shrink-0 place-items-center rounded-sm bg-black/10 text-[10px] font-semibold leading-none";
        badge.textContent = reference.kind === "text" ? "文" : reference.kind === "audio" ? "音" : reference.kind === "video" ? "频" : "图";
        wrapper.appendChild(badge);
    }

    const text = document.createElement("span");
    text.className = "min-w-0 truncate px-0.5 text-[11px] font-semibold leading-none";
    text.textContent = reference.kind === "text" ? reference.text?.slice(0, 8) || reference.title || reference.label : referenceChipDisplayLabel(reference.label);
    wrapper.appendChild(text);
    return wrapper;
}

function appendVideoThumb(wrapper: HTMLElement, url: string) {
    const poster = ossVideoPoster(url, OSS_THUMB_WIDTH);
    if (!poster) {
        if (/^https?:\/\//i.test(url)) {
            const video = document.createElement("video");
            video.src = `${url.split("#")[0]}#t=0.1`;
            video.muted = true;
            video.playsInline = true;
            video.preload = "metadata";
            video.className = "size-5 shrink-0 rounded-sm bg-black object-cover";
            wrapper.appendChild(video);
            return;
        }
        const badge = document.createElement("span");
        badge.className = "grid size-5 shrink-0 place-items-center rounded-sm bg-black/10 text-[10px] font-semibold leading-none";
        badge.textContent = "频";
        wrapper.appendChild(badge);
        return;
    }
    const image = document.createElement("img");
    image.src = poster;
    image.alt = "";
    image.draggable = false;
    image.className = "size-5 shrink-0 rounded-sm object-cover";
    image.addEventListener(
        "error",
        () => {
            image.replaceWith(Object.assign(document.createElement("span"), { className: "grid size-5 shrink-0 place-items-center rounded-sm bg-black/10 text-[10px] font-semibold leading-none", textContent: "频" }));
        },
        { once: true },
    );
    wrapper.appendChild(image);
}

function serializeEditor(editor: HTMLElement) {
    return serializeNodes(editor.childNodes).replace(/\uFEFF/g, "");
}

/**
 * Chrome 回车常插入 `<div>…</div>` / `<div><br></div>`，不能只认 `<br>`，
 * 否则序列化丢换行，失焦按 value 重建后回车会「消失」。
 */
function serializeNodes(nodes: NodeListOf<ChildNode> | ChildNode[]) {
    const list = Array.from(nodes);
    let result = "";
    list.forEach((node, index) => {
        if (node.nodeType === Node.TEXT_NODE) {
            result += node.textContent || "";
            return;
        }
        if (!(node instanceof HTMLElement)) return;
        const label = node.dataset.refLabel;
        if (label) {
            result += label;
            return;
        }
        if (node.tagName === "BR") {
            result += "\n";
            return;
        }
        if (node.tagName === "DIV" || node.tagName === "P") {
            if (result.length && !result.endsWith("\n")) result += "\n";
            result += serializeBlockInner(node);
            const hasMore = list.slice(index + 1).some((next) => {
                if (next.nodeType === Node.TEXT_NODE) return Boolean((next.textContent || "").length);
                return next instanceof HTMLElement;
            });
            if (hasMore && !result.endsWith("\n")) result += "\n";
            return;
        }
        result += serializeNodes(node.childNodes);
    });
    return result;
}

function serializeBlockInner(block: HTMLElement) {
    const children = Array.from(block.childNodes);
    if (!children.length) return "";
    // 空行占位：<div><br></div>
    if (children.length === 1 && children[0] instanceof HTMLElement && children[0].tagName === "BR") return "";
    return serializeNodes(children);
}

/** 把纯文本里的 \\n 还原成 <br>，与 contentEditable 回车结构一致 */
function appendPlainText(parent: HTMLElement | DocumentFragment, text: string) {
    if (!text) return;
    const parts = text.split("\n");
    parts.forEach((part, index) => {
        if (part) parent.append(document.createTextNode(part));
        if (index < parts.length - 1) parent.append(document.createElement("br"));
    });
}

function removeActiveMention() {
    const selection = window.getSelection();
    if (!selection?.rangeCount) return;
    const range = selection.getRangeAt(0);
    const text = textBeforeCaret();
    const match = /@([^\s@]*)$/.exec(text);
    if (!match) return;
    range.setStart(range.startContainer, Math.max(0, range.startOffset - (match[1] || "").length - 1));
    range.deleteContents();
}

// chip 是 contentEditable="false" 的原子块,光标紧邻它按 Backspace/Delete 时整块删除。
function deleteAdjacentReference(key: string) {
    const selection = window.getSelection();
    if (!selection?.rangeCount || !selection.isCollapsed) return false;
    const range = selection.getRangeAt(0);
    const target = adjacentReferenceNode(range, key);
    if (!target) return false;
    const nextCaretNode = document.createTextNode("");
    target.replaceWith(nextCaretNode);
    range.setStart(nextCaretNode, 0);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
    return true;
}

function adjacentReferenceNode(range: Range, key: string) {
    const container = range.startContainer;
    const offset = range.startOffset;
    const previous = key === "Backspace";
    if (container.nodeType === Node.TEXT_NODE) {
        const text = container.textContent || "";
        if ((previous && offset > 0) || (!previous && offset < text.length)) return null;
        return findReferenceSibling(container, previous);
    }
    const children = Array.from(container.childNodes);
    return findReferenceSibling(children[previous ? offset - 1 : offset] || container, previous, true);
}

function findReferenceSibling(node: Node, previous: boolean, includeSelf = false): HTMLElement | null {
    let current: Node | null = includeSelf ? node : previous ? node.previousSibling : node.nextSibling;
    while (current && current.nodeType === Node.TEXT_NODE && !(current.textContent || "").trim()) current = previous ? current.previousSibling : current.nextSibling;
    return current instanceof HTMLElement && current.dataset.refLabel ? current : null;
}

function textBeforeCaret() {
    const selection = window.getSelection();
    if (!selection?.rangeCount) return "";
    const range = selection.getRangeAt(0).cloneRange();
    const editor = closestEditor(range.startContainer);
    if (!editor) return "";
    range.setStart(editor, 0);
    return range.toString();
}

function caretRect(): DOMRect | null {
    const selection = window.getSelection();
    if (!selection?.rangeCount) return null;
    const range = selection.getRangeAt(0).cloneRange();
    range.collapse(true);
    const rect = range.getBoundingClientRect();
    if (rect.width || rect.height || rect.left || rect.top) return rect;
    // 空行/空编辑器时 range 无尺寸,退回到编辑器盒子。
    const editor = closestEditor(range.startContainer);
    return editor ? editor.getBoundingClientRect() : null;
}

function closestEditor(node: Node) {
    const element = node instanceof Element ? node : node.parentElement;
    return element?.closest("[contenteditable='true']") || null;
}

function placeCaretAtEnd(element: HTMLElement) {
    const range = document.createRange();
    range.selectNodeContents(element);
    range.collapse(false);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
}

// 按 active label(已按长度降序)把 value 文本切成「文本片段 + 命中的引用 label」。
// 有连线提供的 label 时，「图片1」等应回显为 chip（含「请参考图片1」这类写法）。
function parseTokens(value: string, labels: string[]): Token[] {
    if (!labels.length) return value ? [{ type: "text", value }] : [];
    const escaped = labels.map(escapeRegExp).join("|");
    const pattern = new RegExp(`(${escaped})`, "g");
    const tokens: Token[] = [];
    let lastIndex = 0;
    for (const match of value.matchAll(pattern)) {
        if (match.index === undefined) continue;
        if (match.index > lastIndex) tokens.push({ type: "text", value: value.slice(lastIndex, match.index) });
        tokens.push({ type: "reference", label: match[0] });
        lastIndex = match.index + match[0].length;
    }
    if (lastIndex < value.length) tokens.push({ type: "text", value: value.slice(lastIndex) });
    return tokens;
}

function escapeRegExp(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function clamp(value: number, min: number, max: number) {
    if (max < min) return min;
    return Math.min(Math.max(value, min), max);
}
