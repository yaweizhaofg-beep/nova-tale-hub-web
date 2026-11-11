import { useEffect, useRef } from 'react';
import type { Nav } from '@/router/page-location';
import { USER } from '@/shared';
import { getActiveMembers } from '@/team';
import { CANVAS_TEAM_REQUEST, CANVAS_TEAM_SUMMARY, isCanvasId, isCanvasNavigation, type CanvasTeamSummary } from './frame-bridge';

export function CanvasFrame({ navigate, projectId, create }: Nav & {
  projectId?: string;
  create?: boolean;
}) {
  const frame = useRef<HTMLIFrameElement>(null);
  const params = new URLSearchParams();
  const editor = isCanvasId(projectId);
  if (editor) params.set('project', projectId);
  if (create) params.set('create', '1');
  const query = params.size ? '?' + params.toString() : '';

  useEffect(() => {
    const iframe = frame.current;
    if (!iframe) return;
    const root = document.documentElement;
    const header = editor ? null : iframe.closest('.studio-main')?.parentElement?.querySelector('.studio-header');
    const alignLibrary = () => {
      if (!header) return;
      iframe.contentDocument?.documentElement.style.setProperty(
        '--canvas-library-gutter',
        getComputedStyle(header).paddingInlineStart,
      );
    };
    let disconnect = () => {};
    const attach = () => {
      disconnect();
      root.removeAttribute('data-canvas-modal-open');
      alignLibrary();
      const body = iframe.contentDocument?.body;
      if (!body) return;
      let hosts: Element[] = [];
      let wrappers: HTMLElement[] = [];
      const reflect = () => root.toggleAttribute('data-canvas-modal-open',
        wrappers.some((item) => item.getClientRects().length > 0));
      const visibility = new MutationObserver(reflect);
      const track = () => {
        visibility.disconnect();
        wrappers = hosts.flatMap((host) => Array.from(host.querySelectorAll<HTMLElement>('.ant-modal-wrap')));
        for (const wrapper of wrappers) visibility.observe(wrapper, { attributes: true, attributeFilter: ['style', 'class'] });
        reflect();
      };
      // Ant Design 弹窗挂载到 body 的独立容器，无需订阅画布节点的 DOM 变化。
      const contents = new MutationObserver(track);
      const trackHosts = () => {
        contents.disconnect();
        hosts = Array.from(body.children).filter((host) => host.id !== 'root');
        for (const host of hosts) contents.observe(host, { childList: true });
        track();
      };
      const portals = new MutationObserver(trackHosts);
      portals.observe(body, { childList: true });
      trackHosts();
      disconnect = () => { portals.disconnect(); contents.disconnect(); visibility.disconnect(); };
    };
    attach();
    iframe.addEventListener('load', attach);
    if (header) window.addEventListener('resize', alignLibrary);
    return () => {
      iframe.removeEventListener('load', attach);
      if (header) window.removeEventListener('resize', alignLibrary);
      disconnect();
      root.removeAttribute('data-canvas-modal-open');
    };
  }, [editor, query]);

  useEffect(() => {
    const handleNavigation = (event: MessageEvent<unknown>) => {
      if (event.origin !== window.location.origin || event.source !== frame.current?.contentWindow) return;
      const navigation = event.data;
      if (editor && navigation === CANVAS_TEAM_REQUEST) {
        const summary: CanvasTeamSummary = {
          type: CANVAS_TEAM_SUMMARY,
          name: USER.team,
          members: getActiveMembers().map(({ id, name, avatar, role, online }) => ({ id, name, avatar, role, online })),
        };
        frame.current?.contentWindow?.postMessage(summary, window.location.origin);
        return;
      }
      if (!isCanvasNavigation(navigation)) return;
      if (navigation.page === 'editor') {
        navigate('canvas', { canvas: navigation.id, kind: null, create: null });
      } else if (navigation.page === 'list') {
        navigate('projects', { kind: 'canvas', canvas: null, create: null });
      } else if (navigation.page === 'team') {
        navigate('team', { tab: 'members', canvas: null, kind: null, create: null });
      } else {
        navigate('workspace', { canvas: null, kind: null, create: null });
      }
    };
    window.addEventListener('message', handleNavigation);
    return () => window.removeEventListener('message', handleNavigation);
  }, [editor, navigate]);

  return (
    <iframe
      ref={frame}
      src={import.meta.env.BASE_URL + 'canvas-runtime.html' + query}
      title={editor ? '画布编辑器' : '画布库'}
      className={editor ? undefined : 'studio-canvas-library-frame'}
      style={{ width: '100%', height: '100%', minHeight: 0, border: 0, display: 'block', background: '#090a0e' }}
    />
  );
}
