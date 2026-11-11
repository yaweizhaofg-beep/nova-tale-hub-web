import { lazy, Suspense, useEffect, useState, type FormEvent } from 'react';
import { createRoot } from 'react-dom/client';
import { API_BASE_URL } from '@canvas/constant/env';
import { CANVAS_SESSION_EXPIRED, isCanvasId } from './frame-bridge';
import { readCanvasSession, storeCanvasSession } from './canvas-session';
import styles from './frame-entry.module.css';

const CanvasRuntime = lazy(() => import('./frame-app'));
const params = new URLSearchParams(window.location.search);
const project = params.get('project');
const projectId = isCanvasId(project) ? project : undefined;

function FrameEntry() {
  const [session, setSession] = useState(readCanvasSession);
  const [token, setToken] = useState('');
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const expired = () => window.location.reload();
    window.addEventListener(CANVAS_SESSION_EXPIRED, expired);
    return () => window.removeEventListener(CANVAS_SESSION_EXPIRED, expired);
  }, []);

  async function connect(event: FormEvent) {
    event.preventDefault();
    const credential = token.trim().replace(/^Bearer\s+/i, '');
    if (!credential || checking) return;
    setChecking(true);
    setError('');
    try {
      const response = await fetch(API_BASE_URL + '/admin/profile/points', {
        headers: { Authorization: 'Bearer ' + credential, Accept: 'application/json' },
        signal: AbortSignal.timeout(15000),
        redirect: 'error',
      });
      if (response.status === 401 || response.status === 403) {
        setError('凭证无效、已过期或无权使用画布。');
        return;
      }
      if (!response.ok) throw new Error('Profile request failed');
      const { subjectType, subjectId } = await response.json();
      if ((subjectType !== 'STAFF' && subjectType !== 'TALENT') ||
        typeof subjectId !== 'number' || !Number.isSafeInteger(subjectId) || subjectId <= 0) {
        setError('此账号缺少画布所需的平台身份。');
        return;
      }
      const next = { token: credential, subjectType, subjectId } as const;
      storeCanvasSession(next);
      setToken('');
      setSession(next);
    } catch {
      setError('连接画布服务失败，请确认 API 地址和网络后重试。');
    } finally {
      setChecking(false);
    }
  }

  if (session) return (
    <Suspense fallback={<p role="status" className={styles.center}>正在加载画布…</p>}>
      <CanvasRuntime projectId={projectId} create={params.get('create') === '1'} />
    </Suspense>
  );

  return (
    <main className={styles.center}>
      <form className={styles.panel} onSubmit={connect}>
        <h1>连接星核画布</h1>
        <p>输入平台访问凭证后，即可使用云端画布、资产和 AI 生成。</p>
        <label htmlFor="canvas-token">平台访问凭证</label>
        <input id="canvas-token" type="password" value={token} autoComplete="off" required
          onChange={(event) => setToken(event.target.value)} />
        {error && <p role="alert">{error}</p>}
        <button type="submit" disabled={!token.trim() || checking}>
          {checking ? '正在验证…' : '连接画布'}
        </button>
        {window.parent !== window && <button type="button" className={styles.back}
          onClick={() => window.parent.postMessage({ type: 'nova-canvas:navigate', page: 'workspace' }, window.location.origin)}>
          返回工作台
        </button>}
      </form>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(<FrameEntry />);
