import { expect, type Page } from '@playwright/test';

const credential = 'canvas-test-token';
const projects = () => new Map([
  ['cv0', {
    id: 'cv0',
    title: '云端测试画布',
    createdAt: '2026-11-05T08:00:00Z',
    updatedAt: '2026-11-05T08:00:00Z',
    payload: { nodes: [], connections: [], backgroundMode: 'dots', viewport: { x: 0, y: 0, k: 1 } },
  }],
]);

export async function mockCanvasPlatform(page: Page, connected = true) {
  if (connected) {
    await page.addInitScript((token) => {
      sessionStorage.setItem('nova:canvas-session', JSON.stringify({ token, subjectType: 'STAFF', subjectId: 42 }));
    }, credential);
  }
  const cloud = projects();
  const audioTasks = new Map<string, unknown>();
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const headers = {
      'access-control-allow-origin': '*',
      'access-control-allow-headers': 'authorization,content-type',
      'access-control-allow-methods': 'GET,POST,PUT,DELETE,OPTIONS',
    };
    if (request.method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers });
      return;
    }
    const reply = (json: unknown, status = 200) => route.fulfill({ status, headers, json });
    if (request.headers()['authorization'] !== 'Bearer ' + credential) {
      await reply({ message: 'invalid token' }, 401);
    } else if (path.endsWith('/admin/profile/points')) {
      await reply({ pointsBalance: 250, subjectType: 'STAFF', subjectId: 42 });
    } else if (path.endsWith('/infinite-canvas/projects')) {
      await reply([...cloud.values()]);
    } else if (path.includes('/infinite-canvas/projects/')) {
      const id = path.slice(path.lastIndexOf('/') + 1);
      if (request.method() === 'PUT') {
        const data = request.postDataJSON();
        const saved = { ...data, id, createdAt: '2026-11-05T08:00:00Z', updatedAt: new Date().toISOString() };
        cloud.set(id, saved);
        await reply(saved);
      } else if (request.method() === 'DELETE' && cloud.delete(id)) {
        await route.fulfill({ status: 204, headers });
      } else {
        const item = cloud.get(id);
        await reply(item ?? { message: 'not found' }, item ? 200 : 404);
      }
    } else if (path.endsWith('/infinite-canvas/assets')) {
      expect(url.searchParams.get('staffId')).toBe('42');
      await reply({ total: 0, records: [], items: [], content: [] });
    } else if (path.endsWith('/infinite-canvas/audio/models')) {
      await reply([{ id: 23, model_key: 'seed-audio-1.0', name: '测试音频模型', configured: true }]);
    } else if (path.endsWith('/infinite-canvas/audio/tasks') && request.method() === 'POST') {
      const { requestId, prompt } = request.postDataJSON();
      const task = {
        id: requestId, status: 'SUCCEEDED', reserved_points: 10, actual_points: 2, duration: 4,
        request_json: JSON.stringify({ text_prompt: prompt }),
        audio_url: 'https://canvas-fixture.invalid/test.mp3',
      };
      audioTasks.set(requestId, task);
      await reply(task);
    } else if (path.includes('/infinite-canvas/audio/tasks/')) {
      await reply(audioTasks.get(path.slice(path.lastIndexOf('/') + 1)));
    } else if (path.endsWith('/infinite-canvas/text/models')) {
      await reply([{ id: 10, name: '测试文本模型', modelKey: 'fixture-text' }]);
    } else if (path.endsWith('/infinite-canvas/text/generations')) {
      await reply({ content: '这是测试模型返回的文本' });
    } else if (path.endsWith('/image-tasks/options')) {
      await reply({ routes: [], models: [] });
    } else if (path.endsWith('/infinite-canvas/preferences')) {
      await reply({ payload: {} });
    } else {
      await reply([]);
    }
  });
  await page.route('https://canvas-fixture.invalid/**', (route) => route.abort());
  return credential;
}
