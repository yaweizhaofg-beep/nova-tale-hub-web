import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { App, Button, Input, Modal, Pagination, Spin } from "antd";
import { Download, FileUp, Plus, Search, Trash2, Workflow } from "canvas-lucide";

import { setMediaBlob } from "@canvas/services/file-storage";
import { setImageBlob } from "@canvas/services/image-storage";
import { CanvasDeleteProjectsDialog } from "@canvas/components/canvas/canvas-delete-projects-dialog";
import { CanvasProjectCard } from "@canvas/components/canvas/canvas-project-card";
import type { CanvasExportFile } from "@canvas/types/canvas-export";
import { useCanvasStore, type CanvasProject } from "@canvas/stores/canvas/use-canvas-store";
import { useCanvasUiStore } from "@canvas/stores/canvas/use-canvas-ui-store";
import { APP_NAME } from "@canvas/constant/app-brand";
import { loadCloudProjectsIntoLocal } from "@canvas/lib/canvas/canvas-cloud-save";
import { canvasStorageName } from "@canvas/lib/auth-token";
import styles from "./index.module.css";

const PAGE_SIZE = 24;
const LIST_CACHE_MS = 60_000;

function libraryViewKey() {
    return canvasStorageName() + ":library-view";
}

function readLibraryView() {
    try {
        const saved: { query?: unknown; page?: unknown; scrollTop?: unknown } | null =
            JSON.parse(sessionStorage.getItem(libraryViewKey()) ?? "null");
        return {
            query: typeof saved?.query === "string" ? saved.query : "",
            page: typeof saved?.page === "number" && Number.isSafeInteger(saved.page) && saved.page > 0 ? saved.page : 1,
            scrollTop: typeof saved?.scrollTop === "number" && Number.isFinite(saved.scrollTop) && saved.scrollTop > 0 ? saved.scrollTop : 0,
        };
    } catch {
        return { query: "", page: 1, scrollTop: 0 };
    }
}

export default function CanvasPage({ syncCloud }: { syncCloud: boolean }) {
    const { message } = App.useApp();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const inputRef = useRef<HTMLInputElement>(null);
    const scrollRef = useRef<HTMLElement>(null);
    const restoredScroll = useRef(false);
    const hydrated = useCanvasStore((state) => state.hydrated);
    const projects = useCanvasStore((state) => state.projects);
    const librarySyncedAt = useCanvasStore((state) => state.librarySyncedAt);
    const createProject = useCanvasStore((state) => state.createProject);
    const importProject = useCanvasStore((state) => state.importProject);
    const selectedIds = useCanvasUiStore((state) => state.selectedProjectIds);
    const setDeleteIds = useCanvasUiStore((state) => state.setDeleteProjectIds);
    const [syncSettled, setSyncSettled] = useState(false);

    const [creating, setCreating] = useState(searchParams.get("create") === "1");
    const [draftName, setDraftName] = useState("");
    const [savedView] = useState(readLibraryView);
    const [query, setQuery] = useState(savedView.query);
    const [page, setPage] = useState(savedView.page);
    const search = query.trim().toLocaleLowerCase();
    const matchingProjects = useMemo(
        () => search ? projects.filter((project) => project.title.toLocaleLowerCase().includes(search)) : projects,
        [projects, search],
    );
    const currentPage = Math.min(page, Math.max(1, Math.ceil(matchingProjects.length / PAGE_SIZE)));
    const first = (currentPage - 1) * PAGE_SIZE;
    const visibleProjects = matchingProjects.slice(first, first + PAGE_SIZE);
    const busy = !hydrated || (syncCloud && projects.length === 0 && librarySyncedAt === 0 && !syncSettled);

    function openProject(id: string) {
        try {
            sessionStorage.setItem(libraryViewKey(), JSON.stringify({
                query,
                page: currentPage,
                scrollTop: scrollRef.current?.scrollTop ?? 0,
            }));
        } catch {
            // A storage restriction should not prevent entering the editor.
        }
        navigate("/canvas/" + id);
    }

    function changePage(next: number) {
        setPage(next);
        scrollRef.current?.scrollTo({ top: 0 });
    }

    const createAndEnter = () => {
        const name = draftName.trim();
        if (!name || busy) return;
        setCreating(false);
        openProject(createProject(name));
    };
    const importCanvas = async (file?: File) => {
        if (!file) return;
        const stopLoading = message.loading("正在导入画布…", 0);
        try {
            const { readZip } = await import("@canvas/lib/zip");
            const zip = await readZip(file);
            const projectFile = zip.get("projects.json");
            if (!projectFile) throw new Error("missing projects.json");
            const data = JSON.parse(await projectFile.text()) as CanvasExportFile;
            if (data.app !== "infinite-canvas" || data.version !== 3 || !Array.isArray(data.projects)) {
                throw new Error("不支持的画布压缩包格式");
            }
            await Promise.all(
                data.projects.flatMap((project) =>
                    project.files.map(async (item) => {
                        const blob = zip.get(item.path);
                        if (!blob) return;
                        const typedBlob = blob.type ? blob : blob.slice(0, blob.size, item.mimeType);
                        await (item.storageKey.startsWith("image:") ? setImageBlob(item.storageKey, typedBlob) : setMediaBlob(item.storageKey, typedBlob));
                    }),
                ),
            );
            data.projects.forEach((item) => importProject(item.project));
            message.success(`已导入 ${data.projects.length} 个画布`);
        } catch {
            message.error("导入失败，请检查画布压缩包后重试。");
        } finally {
            stopLoading();
            if (inputRef.current) inputRef.current.value = "";
        }
    };

    const exportProjects = async (items: CanvasProject[], filename: string) => {
        const stopLoading = message.loading("正在导出画布…", 0);
        try {
            const { exportCanvasProjects } = await import("@canvas/lib/canvas/canvas-export");
            await exportCanvasProjects(items, filename);
        } catch {
            message.error("导出画布失败，请重试。");
        } finally {
            stopLoading();
        }
    };

    useEffect(() => {
        if (!hydrated || !syncCloud) return;
        const initial = useCanvasStore.getState();
        const age = Date.now() - initial.librarySyncedAt;
        if (initial.librarySyncedAt > 0 && age >= 0 && age < LIST_CACHE_MS) return;

        const controller = new AbortController();
        const beforeSync = new Map(initial.projects.map((project) => [project.id, project]));
        void loadCloudProjectsIntoLocal(controller.signal)
            .then((cloudProjects) => {
                if (controller.signal.aborted) return;
                const state = useCanvasStore.getState();
                const localById = new Map(state.projects.map((project) => [project.id, project]));
                const remoteIds = new Set(cloudProjects.map((project) => project.id));
                state.replaceProjects([
                    ...state.projects.filter((project) => !remoteIds.has(project.id)),
                    ...cloudProjects.flatMap((remote) => {
                        const cached = localById.get(remote.id);
                        const previous = beforeSync.get(remote.id);
                        // A background response must not undo changes made after it started.
                        if (previous && !cached) return [];
                        if (cached && (cached !== previous || Date.parse(cached.updatedAt) > Date.parse(remote.updatedAt))) {
                            return [{ ...cached, localOnly: undefined }];
                        }
                        return [remote];
                    }),
                ], Date.now());
            })
            .catch((error) => {
                if (!controller.signal.aborted) {
                    message.warning(error instanceof Error ? error.message : "云端画布列表加载失败，仍可使用本地缓存");
                }
            })
            .finally(() => {
                if (!controller.signal.aborted) setSyncSettled(true);
            });
        return () => controller.abort();
    }, [hydrated, message, syncCloud]);

    useLayoutEffect(() => {
        if (busy || restoredScroll.current || !scrollRef.current) return;
        restoredScroll.current = true;
        scrollRef.current.scrollTop = savedView.scrollTop;
    }, [busy, savedView.scrollTop]);

    return (
        <main ref={scrollRef} className="thin-scrollbar h-full overflow-y-auto overscroll-contain bg-background text-foreground">
            <div className={`${styles.content} flex w-full flex-col gap-4 pt-5 pb-24 sm:gap-5 sm:pt-7`}>
                <header className="rounded-2xl border border-border bg-card p-4 dark:bg-[radial-gradient(ellipse_at_top_left,#ff8a1f14,transparent_62%)] sm:p-6">
                    <div className="flex flex-wrap items-end justify-between gap-4">
                        <div className="flex min-w-0 items-center gap-3">
                            <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-xl border border-amber-600/25 bg-amber-600/10 text-amber-800 dark:text-[color:var(--canvas-accent)]">
                                <Workflow className="size-5" />
                            </span>
                            <div className="min-w-0">
                                <h1 className="text-[1.5rem] leading-tight font-semibold tracking-tight sm:text-[1.75rem]">全部画布</h1>
                                <p className="mt-1 text-xs text-muted-foreground sm:text-sm">管理云端画布和本地草稿</p>
                            </div>
                        </div>
                        <div className="grid w-full grid-cols-2 gap-2 min-[550px]:flex min-[550px]:w-auto">
                            <Button disabled={busy} icon={<FileUp aria-hidden className="size-4" />} onClick={() => inputRef.current?.click()}>
                                导入画布
                            </Button>
                            <Button disabled={busy} type="primary" icon={<Plus aria-hidden className="size-4" />} onClick={() => setCreating(true)}>
                                新建画布
                            </Button>
                        </div>
                    </div>
                </header>
                <section aria-label="画布筛选与管理" className="rounded-xl border border-border bg-card p-3 sm:px-4">
                    <div className="flex flex-wrap items-center justify-between gap-2.5">
                        <Input aria-label="搜索画布" placeholder="搜索画布" className="max-w-[340px]" allowClear
                            prefix={<Search aria-hidden className="mr-1 size-4 text-muted-foreground" />}
                            value={query} onChange={(event) => {
                                setQuery(event.target.value);
                                setPage(1);
                            }} />
                        <div className="flex flex-wrap items-center gap-2">
                            <span aria-live="polite" className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground tabular-nums">
                                {search ? `找到 ${matchingProjects.length} 个 / 共 ${projects.length} 个` : `共 ${projects.length} 个画布`}
                            </span>
                            {projects.length > 0 && (
                                <Button danger type="text" size="small" disabled={busy}
                                    icon={<Trash2 aria-hidden className="size-3.5" />} onClick={() => setDeleteIds(projects.map((project) => project.id))}>
                                    删除全部
                                </Button>
                            )}
                        </div>
                    </div>
                    {selectedIds.length > 0 && (
                        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
                            <span aria-live="polite" className="mr-1 text-xs font-medium text-amber-800 tabular-nums dark:text-[color:var(--canvas-accent)]">已选 {selectedIds.length} 个</span>
                            <Button size="small" disabled={busy} icon={<Download aria-hidden className="size-3.5" />}
                                onClick={() => {
                                    const selected = new Set(selectedIds);
                                    void exportProjects(projects.filter((project) => selected.has(project.id)), `${APP_NAME}-${selectedIds.length}个项目`);
                                }}>
                                导出选中
                            </Button>
                            <Button danger type="text" size="small" disabled={busy} onClick={() => setDeleteIds(selectedIds)}>
                                删除选中
                            </Button>
                        </div>
                    )}
                </section>

                {busy ? (
                    <div role="status" className="flex min-h-64 items-center justify-center gap-3 rounded-xl border border-border bg-card text-sm text-muted-foreground">
                        <Spin size="small" />
                        {hydrated ? "正在同步云端画布…" : "正在加载画布…"}
                    </div>
                ) : visibleProjects.length ? (
                    <>
                        <section aria-label="画布列表" className={styles.grid}>
                            {visibleProjects.map((project) => (
                                <CanvasProjectCard key={project.id} project={project}
                                    onOpen={() => openProject(project.id)}
                                    onExport={() => void exportProjects([project], project.title || APP_NAME)} />
                            ))}
                        </section>
                        {matchingProjects.length > PAGE_SIZE && (
                            <nav aria-label="画布分页" className="flex justify-end">
                                <Pagination size="small" simple current={currentPage} pageSize={PAGE_SIZE}
                                    total={matchingProjects.length} showSizeChanger={false} onChange={changePage} />
                            </nav>
                        )}
                    </>
                ) : (
                    <section className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card px-4 text-center">
                        {search
                            ? <Search aria-hidden className="mb-3 size-6 text-muted-foreground" />
                            : <Workflow aria-hidden className="mb-3 size-6 text-muted-foreground" />}
                        <h2 className="text-base font-semibold">{search ? "没有匹配的画布" : "还没有画布"}</h2>
                        <p className="mt-1.5 text-sm text-muted-foreground">
                            {search ? "试试其他关键词，或清除搜索查看全部画布。" : "新建画布后即可开始添加节点和连线。"}
                        </p>
                        {search ? (
                            <Button className="mt-4" onClick={() => { setQuery(""); setPage(1); }}>清除搜索</Button>
                        ) : (
                            <Button type="primary" className="mt-4" icon={<Plus aria-hidden className="size-4" />} onClick={() => setCreating(true)}>新建画布</Button>
                        )}
                    </section>
                )}
            </div>

            <input ref={inputRef} type="file" accept="application/zip,.zip" className="hidden" onChange={(event) => void importCanvas(event.target.files?.[0])} />
            <CanvasDeleteProjectsDialog />
            <Modal title="新建画布" open={creating} centered onCancel={() => setCreating(false)}
                onOk={createAndEnter} okText="创建画布" cancelText="取消"
                okButtonProps={{ disabled: busy || !draftName.trim() }}>
                <Input aria-label="画布名称" placeholder="输入画布名称" maxLength={80}
                    value={draftName} onChange={(event) => setDraftName(event.target.value)} onPressEnter={createAndEnter} />
            </Modal>
        </main>
    );
}
