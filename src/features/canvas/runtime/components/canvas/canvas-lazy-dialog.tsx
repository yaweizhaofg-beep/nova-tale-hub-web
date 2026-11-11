import { Component, Suspense, type ReactNode } from "react";
import { Modal, Spin } from "antd";

type Props = { children: ReactNode; onClose: () => void };

export class CanvasLazyDialog extends Component<Props, { failed: boolean }> {
    state = { failed: false };

    static getDerivedStateFromError() {
        return { failed: true };
    }

    render() {
        const { children, onClose } = this.props;
        if (this.state.failed) {
            return (
                <Modal title="工具加载失败" open centered footer={null} onCancel={onClose}>
                    <p className="text-sm text-muted-foreground">关闭弹窗后可以继续编辑。保存画布并刷新页面后，可再次打开此工具。</p>
                </Modal>
            );
        }

        return (
            <Suspense fallback={
                <Modal title="正在加载工具" open centered footer={null} onCancel={onClose}>
                    <div role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Spin size="small" /> 正在准备画布工具…
                    </div>
                </Modal>
            }>
                {children}
            </Suspense>
        );
    }
}
