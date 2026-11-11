import { useState } from "react";
import { App, Button, Modal } from "antd";

import { deleteCloudProjects } from "@canvas/lib/canvas/canvas-cloud-save";
import { useAssetStore } from "@canvas/stores/use-asset-store";
import { useCanvasStore } from "@canvas/stores/canvas/use-canvas-store";
import { useCanvasUiStore } from "@canvas/stores/canvas/use-canvas-ui-store";

export function CanvasDeleteProjectsDialog() {
    const { message } = App.useApp();
    const ids = useCanvasUiStore((state) => state.deleteProjectIds);
    const setDeleteIds = useCanvasUiStore((state) => state.setDeleteProjectIds);
    const removeSelectedIds = useCanvasUiStore((state) => state.removeSelectedProjectIds);
    const deleteProjects = useCanvasStore((state) => state.deleteProjects);
    const cleanupImages = useAssetStore((state) => state.cleanupImages);
    const [deleting, setDeleting] = useState(false);

    const confirm = async () => {
        if (deleting || !ids.length) return;
        setDeleting(true);
        try {
            const { deleted, failed } = await deleteCloudProjects(ids);
            if (deleted.length) {
                deleteProjects(deleted);
                cleanupImages();
                removeSelectedIds(deleted);
            }
            setDeleteIds(failed);
            if (failed.length) message.error(failed.length + " 个画布删除失败，可重试。");
            else message.success("已删除画布");
        } catch (error) {
            message.error(error instanceof Error ? error.message : "删除失败");
        } finally {
            setDeleting(false);
        }
    };

    return (
        <Modal
            title="删除画布？"
            open={ids.length > 0}
            centered
            onCancel={() => !deleting && setDeleteIds([])}
            footer={
                <>
                    <Button disabled={deleting} onClick={() => setDeleteIds([])}>
                        取消
                    </Button>
                    <Button danger type="primary" loading={deleting} onClick={() => void confirm()}>
                        删除
                    </Button>
                </>
            }
        >
            <p className="text-sm text-stone-500">将删除 {ids.length} 个画布（含云端与本地缓存），里面的节点和连线也会一起移除。</p>
        </Modal>
    );
}
