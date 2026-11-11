import { App } from "antd";
import copy from "copy-to-clipboard";

export function useCopyText() {
    const { message } = App.useApp();

    return async (value: string, successText = "已复制") => {
        try {
            if (await copy(value)) {
                message.success(successText);
                return;
            }
        } catch {
            // 部分浏览器或宿主会拒绝访问剪贴板。
        }
        message.error("复制失败，请选中文字后手动复制");
    };
}
