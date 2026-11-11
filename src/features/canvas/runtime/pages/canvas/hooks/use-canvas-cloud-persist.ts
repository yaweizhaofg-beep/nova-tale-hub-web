import { useCallback, useEffect, useRef, useState } from "react";
import { App } from "antd";
import { useBlocker } from "react-router";

import { mergeAfterCloudSave, mergeCloudNodes, saveProjectToCloud } from "@canvas/lib/canvas/canvas-cloud-save";
import { useCanvasStore, type CanvasProject } from "@canvas/stores/canvas/use-canvas-store";
import type { CanvasAssistantSession, CanvasConnection, CanvasNodeData } from "@canvas/types/canvas";

const AUTOSAVE_MS = 60_000;

type Options = {
    enabled: boolean;
    project: CanvasProject | null;
    /** 内容变更时递增，用于标记未云端保存 */
    contentRevision: number;
    /** 同步读取最新画布（含 nodesRef），避免 await 间隙 props 未刷新 */
    getLatestProject?: () => CanvasProject | null;
    onSaved: (saved: {
        project: CanvasProject;
        /** 与当前 React nodes 再合并后的结果，调用方应用 functional setState */
        mergeNodes: (prev: CanvasNodeData[]) => CanvasNodeData[];
        mergeConnections: (prev: CanvasConnection[]) => CanvasConnection[];
        mergeChatSessions: (prev: CanvasAssistantSession[]) => CanvasAssistantSession[];
    }) => void;
};

/**
 * 画布云端保存：手动/自动（1 分钟）/离开页面提示。
 */
export function useCanvasCloudPersist({ enabled, project, contentRevision, getLatestProject, onSaved }: Options) {
    const { message, modal } = App.useApp();
    const updateProject = useCanvasStore((state) => state.updateProject);
    const [saving, setSaving] = useState(false);
    const [cloudDirty, setCloudDirty] = useState(false);
    const savingRef = useRef(false);
    const cloudDirtyRef = useRef(false);
    const revisionRef = useRef(contentRevision);
    revisionRef.current = contentRevision;
    const projectRef = useRef(project);
    projectRef.current = project;
    const getLatestRef = useRef(getLatestProject);
    getLatestRef.current = getLatestProject;
    const onSavedRef = useRef(onSaved);
    onSavedRef.current = onSaved;
    const bypassLeaveRef = useRef(false);
    const skipDirtyOnceRef = useRef(true);
    const leavePromptOpenRef = useRef(false);

    const applySaved = useCallback(
        (merged: CanvasProject, savedSnapshot: CanvasProject, submitted: CanvasProject) => {
            onSavedRef.current({
                project: merged,
                mergeNodes: (prev) => mergeCloudNodes(prev, savedSnapshot.nodes, submitted.nodes),
                mergeConnections: (prev) => prev,
                mergeChatSessions: (prev) => prev,
            });
            // nodes/connections 由页面 functional setState + 同步 effect 回写 store，避免用过期快照盖住生成中状态
            updateProject(merged.id, {
                title: merged.title,
                updatedAt: merged.updatedAt,
                createdAt: merged.createdAt,
                localOnly: merged.localOnly,
                activeChatId: merged.activeChatId,
                backgroundMode: merged.backgroundMode,
                showImageInfo: merged.showImageInfo,
                viewport: merged.viewport,
            });
            cloudDirtyRef.current = false;
            setCloudDirty(false);
        },
        [updateProject],
    );

    const saveToCloud = useCallback(
        async (opts?: { silent?: boolean }) => {
            const current = getLatestRef.current?.() || projectRef.current;
            if (!current || savingRef.current) return false;
            const submittedRevision = revisionRef.current;
            savingRef.current = true;
            setSaving(true);
            const silent = Boolean(opts?.silent);
            let hide: (() => void) | undefined;
            if (!silent) {
                hide = message.loading("正在保存画布…", 0);
            }
            try {
                const saved = await saveProjectToCloud(
                    current,
                    silent
                        ? undefined
                        : (text) => {
                              hide?.();
                              hide = message.loading(text, 0);
                          },
                );
                const latest = getLatestRef.current?.() || projectRef.current || current;
                // 以保存完成后的本地为准合并，避免「生成中空节点」快照覆盖刚写回的视频/图片
                const merged = mergeAfterCloudSave(latest, saved, current);
                const cloudStale = revisionRef.current !== submittedRevision;
                skipDirtyOnceRef.current = true;
                applySaved(merged, saved, current);
                hide?.();
                if (!silent) message.success("画布已保存到云端");
                if (cloudStale) {
                    // 云端仍是旧快照，标记 dirty，下一轮自动保存推送最新（含已生成的视频）
                    cloudDirtyRef.current = true;
                    setCloudDirty(true);
                    skipDirtyOnceRef.current = false;
                }
                return true;
            } catch (error) {
                hide?.();
                if (!silent) message.error(error instanceof Error ? error.message : "保存失败");
                return false;
            } finally {
                savingRef.current = false;
                setSaving(false);
            }
        },
        [applySaved, message],
    );

    useEffect(() => {
        skipDirtyOnceRef.current = true;
        bypassLeaveRef.current = false;
        cloudDirtyRef.current = false;
        setCloudDirty(false);
    }, [project?.id]);

    useEffect(() => {
        if (!enabled || !project?.id) return;
        if (skipDirtyOnceRef.current) {
            skipDirtyOnceRef.current = false;
            return;
        }
        cloudDirtyRef.current = true;
        setCloudDirty((prev) => (prev ? prev : true));
        // 只跟内容修订号走，避免 liveCloudProject 每次新建对象触发无意义更新
    }, [contentRevision, enabled, project?.id]);

    useEffect(() => {
        if (!enabled || !project?.id) return;
        const timer = window.setInterval(() => {
            if (savingRef.current || !cloudDirtyRef.current) return;
            void saveToCloud({ silent: true });
        }, AUTOSAVE_MS);
        return () => window.clearInterval(timer);
    }, [enabled, project?.id, saveToCloud]);

    useEffect(() => {
        if (!enabled) return;
        const onBeforeUnload = (event: BeforeUnloadEvent) => {
            if (!cloudDirtyRef.current) return;
            event.preventDefault();
            event.returnValue = "";
        };
        window.addEventListener("beforeunload", onBeforeUnload);
        return () => window.removeEventListener("beforeunload", onBeforeUnload);
    }, [enabled]);

    useEffect(() => {
        if (!enabled) return;
        const onVisibility = () => {
            if (document.visibilityState !== "hidden") return;
            if (!cloudDirtyRef.current || savingRef.current) return;
            void saveToCloud({ silent: true });
        };
        document.addEventListener("visibilitychange", onVisibility);
        return () => document.removeEventListener("visibilitychange", onVisibility);
    }, [enabled, saveToCloud]);

    const shouldBlockNav = useCallback(
        ({ currentLocation, nextLocation }: { currentLocation: { pathname: string }; nextLocation: { pathname: string } }) =>
            Boolean(enabled && cloudDirtyRef.current && !bypassLeaveRef.current && currentLocation.pathname !== nextLocation.pathname),
        [enabled],
    );
    const blocker = useBlocker(shouldBlockNav);

    useEffect(() => {
        if (blocker.state !== "blocked") {
            leavePromptOpenRef.current = false;
            return;
        }
        if (leavePromptOpenRef.current) return;
        leavePromptOpenRef.current = true;

        let settled = false;
        const finish = (proceed: boolean) => {
            if (settled) return;
            settled = true;
            leavePromptOpenRef.current = false;
            if (proceed) {
                const latest = getLatestRef.current?.();
                if (latest) updateProject(latest.id, latest);
                blocker.proceed?.();
            } else {
                blocker.reset?.();
            }
        };

        modal.confirm({
            title: "保存画布？",
            content: "离开前是否将当前画布保存到云端？",
            okText: "保存并离开",
            cancelText: "不保存",
            centered: true,
            maskClosable: false,
            onOk: async () => {
                const ok = await saveToCloud({ silent: false });
                if (!ok) {
                    finish(false);
                    return Promise.reject();
                }
                finish(true);
            },
            onCancel: () => finish(true),
        });
    }, [blocker, modal, saveToCloud, updateProject]);

    const bypassNextLeave = useCallback(() => {
        bypassLeaveRef.current = true;
        cloudDirtyRef.current = false;
        setCloudDirty(false);
    }, []);

    return { saving, cloudDirty, saveToCloud, bypassNextLeave };
}
