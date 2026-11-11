import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react';
import { createMemoryRouter, RouterProvider, Outlet, useLocation, useParams, Link } from 'react-router';
import { App, ConfigProvider, Spin } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { getAntThemeConfig } from '@canvas/lib/app-theme';
import { canvasFontFamily, canvasThemes } from '@canvas/lib/canvas-theme';
import { projectFromCloudDto } from '@canvas/lib/canvas/canvas-cloud-save';
import { fetchInfiniteCanvasProject } from '@canvas/services/api/backend-client';
import { useCanvasStore, flushCanvasStorage } from '@canvas/stores/canvas/use-canvas-store';
import { useThemeStore } from '@canvas/stores/use-theme-store';
import { isCanvasId, type CanvasNavigation } from './frame-bridge';
import 'antd/dist/reset.css';
import '@canvas/styles/globals.css';

const CanvasEditor = lazy(() => import('@canvas/pages/canvas/project'));
const CanvasList = lazy(() => import('@canvas/pages/canvas'));

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false, staleTime: 30000 } },
});

function CanvasRouteLoading() {
  return <div className="grid h-full place-items-center bg-background"><Spin aria-label="正在加载画布" /></div>;
}

function LibraryRoute({ syncCloud }: { syncCloud: boolean }) {
  return <Suspense fallback={<CanvasRouteLoading />}><CanvasList syncCloud={syncCloud} /></Suspense>;
}

function FrameNavigation({ initial }: { initial: string }) {
  const { pathname } = useLocation();
  const { message } = App.useApp();

  useEffect(() => {
    if (pathname === initial || window.parent === window) return;
    const id = pathname.startsWith('/canvas/') ? pathname.slice('/canvas/'.length) : undefined;
    const route: CanvasNavigation = isCanvasId(id)
      ? { type: 'nova-canvas:navigate', page: 'editor', id }
      : { type: 'nova-canvas:navigate', page: pathname === '/team' ? 'team' : pathname === '/' ? 'workspace' : 'list' };
    let active = true;
    void flushCanvasStorage().then(() => {
      if (active) window.parent.postMessage(route, window.location.origin);
    }).catch(() => {
      if (active) message.error('本地画布写入失败，请重试或导出备份。');
    });
    return () => { active = false; };
  }, [initial, message, pathname]);
  return null;
}

function ProjectRoute() {
  const { id } = useParams();
  const ready = useCanvasStore((state) => state.hydrated);
  const local = useCanvasStore((state) => state.projects.find((project) => project.id === id));
  const project = useQuery({
    queryKey: ['canvas-project', id],
    enabled: ready && !local && isCanvasId(id),
    queryFn: async () => projectFromCloudDto(await fetchInfiniteCanvasProject(id!)),
  });

  useEffect(() => {
    if (!project.data) return;
    const state = useCanvasStore.getState();
    const remote = project.data;
    if (!state.projects.some((item) => item.id === remote.id)) {
      state.replaceProjects([remote, ...state.projects]);
    }
  }, [project.data]);

  if (local && id) return (
    <Suspense fallback={<CanvasRouteLoading />}>
      <CanvasEditor key={id} />
    </Suspense>
  );
  if (!isCanvasId(id) || project.isError) return (
    <main className="flex h-full flex-col items-center justify-center gap-4 bg-background text-foreground">
      <p>无法加载这张画布，请确认画布仍存在且当前账号有权限。</p>
      <Link to="/canvas">返回全部画布</Link>
    </main>
  );
  return <CanvasRouteLoading />;
}

function RuntimeProviders({ children }: { children: ReactNode }) {
  const mode = useThemeStore((state) => state.theme);
  const dark = mode === 'dark';
  const palette = canvasThemes[mode];
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', dark);
    root.style.colorScheme = mode;
    root.style.setProperty('--canvas-font', canvasFontFamily);
    root.style.setProperty('--canvas-background', palette.canvas.background);
    root.style.setProperty('--canvas-surface', palette.node.fill);
    root.style.setProperty('--canvas-accent', palette.node.activeStroke);
  }, [dark, mode, palette]);

  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider locale={zhCN} theme={getAntThemeConfig(dark)} button={{ autoInsertSpace: false }}
        modal={{ styles: {
          container: { border: '1px solid ' + palette.toolbar.border },
          header: { borderBottom: '1px solid ' + palette.toolbar.border, paddingBottom: 12, marginBottom: 16 },
        } }}
        popover={{ styles: { container: { border: '1px solid ' + palette.toolbar.border } } }}>
        <App className="h-full">{children}</App>
      </ConfigProvider>
    </QueryClientProvider>
  );
}

export default function CanvasRuntime({ projectId, create }: { projectId?: string; create: boolean }) {
  const initial = projectId ? '/canvas/' + projectId : '/canvas';
  // The editor's list route only hands off to the parent, which mounts the library frame.
  const library = <LibraryRoute syncCloud={!projectId || window.parent === window} />;
  const [router] = useState(() => createMemoryRouter([
    {
      element: <><FrameNavigation initial={initial} /><Outlet /></>,
      children: [
        { path: '/canvas', element: library },
        { path: '/canvas/:id', element: <ProjectRoute /> },
        { path: '/team', element: <div className="grid h-full place-items-center bg-background"><Spin aria-label="正在打开团队管理" /></div> },
        { path: '/', element: library },
      ],
    },
  ], { initialEntries: [initial + (create ? '?create=1' : '')] }));

  return <RuntimeProviders><RouterProvider router={router} /></RuntimeProviders>;
}
