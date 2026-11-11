export function formatStyleDescription(style?: string | null): string {
    return String(style ?? "").trim();
}

/** 将风格描述拼在用户提示词前；若已以风格开头则不重复 */
export function resolveImageVideoPrompt(style: string | undefined | null, prompt: string): string {
    const styleText = formatStyleDescription(style);
    const body = prompt.trim();
    if (!styleText) return body;
    if (!body) return styleText;
    if (body.startsWith(styleText)) return body;
    return `${styleText}\n${body}`;
}

/** 空提示词时预填风格描述，保留换行便于继续输入 */
export function initialPromptWithStyle(style: string | undefined | null): string {
    const styleText = formatStyleDescription(style);
    return styleText ? `${styleText}\n` : "";
}
