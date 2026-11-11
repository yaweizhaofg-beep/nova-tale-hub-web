import { expect, test, type Page } from '@playwright/test';
import { mockCanvasPlatform } from './canvas-platform-fixture';

const cropChunk = /\/assets\/canvas-node-crop-dialog-[\w-]+\.js$/;

async function openImageCanvas(page: Page) {
  await page.addInitScript(() => sessionStorage.setItem('xinghe-demo-auth', '1'));
  await mockCanvasPlatform(page);
  await page.route('**/api/admin/infinite-canvas/projects/cv0', route => route.fulfill({
    headers: { 'access-control-allow-origin': '*' },
    json: {
      id: 'cv0', title: '图片编辑回归', payload: {
        nodes: [{
          id: 'image-edit', title: '参考图', type: 'image', width: 260, height: 180,
          position: { x: 240, y: 190 }, metadata: {
            content: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lL0AAAAASUVORK5CYII=',
          },
        }],
        connections: [], backgroundMode: 'dots', viewport: { x: 0, y: 0, k: 1 },
      },
    },
  }));
  await page.goto('/?page=canvas&canvas=cv0');
  const editor = page.frameLocator('iframe[title="画布编辑器"]');
  await editor.locator('[data-node-id="image-edit"]').click();
  return editor;
}

test('the canvas library fits a narrow screen and loads archive code when exporting', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => sessionStorage.setItem('xinghe-demo-auth', '1'));
  await mockCanvasPlatform(page);
  await page.route('**/api/admin/infinite-canvas/projects', route => route.fulfill({
    headers: { 'access-control-allow-origin': '*' },
    json: [{ id: 'cv0', title: '云端测试画布', payload: {
      nodes: [
        { id: 'text', title: '文本', type: 'text', position: { x: 0, y: 0 }, width: 120, height: 100 },
        { id: 'image', title: '图片', type: 'image', position: { x: 180, y: 40 }, width: 120, height: 100 },
      ],
      connections: [{ id: 'edge', fromNodeId: 'text', toNodeId: 'image' }],
    } }],
  }));
  const requests: string[] = [];
  page.on('request', request => requests.push(new URL(request.url()).pathname));
  await page.goto('/?page=projects&kind=canvas');
  const library = page.frameLocator('iframe[title="画布库"]');
  const card = library.getByRole('article').filter({ hasText: '云端测试画布' });
  await expect(card).toBeVisible();
  await expect(card.getByText('云端画布', { exact: true })).toHaveCount(0);
  const list = library.getByRole('region', { name: '画布列表' });
  for (const width of [1536, 775, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 560 });
    await expect.poll(async () => {
      const [content, status, points] = await Promise.all([
        list.boundingBox(),
        page.locator('.studio-status').boundingBox(),
        page.getByRole('button', { name: '会员积分' }).boundingBox(),
      ]);
      return !!(content && status && points &&
        Math.abs(content.x - status.x) <= 1 &&
        Math.abs(content.x + content.width - points.x - points.width) <= 1);
    }).toBe(true);
    if (width === 1536) {
      const columns = await list.evaluate(element => getComputedStyle(element).gridTemplateColumns);
      expect(columns.split(' ')).toHaveLength(4);
    }
  }
  const graphPreview = card.locator('svg[viewBox="0 0 320 144"]');
  await expect(graphPreview.locator('rect')).toHaveCount(2);
  await expect(graphPreview.locator('path')).toHaveCount(1);
  const scroller = library.getByRole('main');
  expect(await scroller.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
  const scrollWidth = await scroller.evaluate(element => getComputedStyle(element, '::-webkit-scrollbar').width);
  expect(scrollWidth).toBe('8px');
  expect(await page.locator('.studio-main').evaluate(element => getComputedStyle(element, '::-webkit-scrollbar').width)).toBe(scrollWidth);
  expect(requests.some(path => /\/assets\/(?:project|zip|canvas-export)-[^/]+\.js$/.test(path))).toBe(false);
  expect(requests.some(path => path.endsWith('/infinite-canvas/preferences'))).toBe(false);

  const search = library.getByRole('textbox', { name: '搜索画布' });
  await search.fill('没有这张画布');
  await expect(library.getByRole('heading', { name: '没有匹配的画布' })).toBeVisible();
  await library.getByRole('button', { name: '清除搜索' }).click();
  await card.getByRole('checkbox', { name: '选择 云端测试画布' }).check();
  await expect(library.getByText('已选 1 个', { exact: true })).toBeVisible();
  const archive = page.waitForEvent('download');
  await library.getByRole('button', { name: '导出选中' }).click();
  const download = await archive;
  expect(download.suggestedFilename()).toMatch(/\.zip$/);
  expect(requests.some(path => /\/assets\/canvas-export-[\w-]+\.js$/.test(path))).toBe(true);
  await library.locator('input[type="file"]').setInputFiles(await download.path());
  await expect(library.getByRole('article').filter({ hasText: '云端测试画布' })).toHaveCount(2);
  await expect(library.getByText('本地草稿', { exact: true })).toBeVisible();
});

test('large canvas libraries render one page and restore their view when returning from the editor', async ({ page }) => {
  const now = Date.now();
  await page.clock.setFixedTime(now);
  await page.addInitScript(() => sessionStorage.setItem('xinghe-demo-auth', '1'));
  await mockCanvasPlatform(page);
  const projects = Array.from({ length: 120 }, (_, index) => ({
    id: 'cv' + index,
    title: (index < 72 ? '星耀画布 ' : '其他画布 ') + index,
    updatedAt: new Date(now).toISOString(),
    payload: { nodes: [], connections: [] },
  }));
  let listRequests = 0;
  let finishRefresh!: () => void;
  const pendingRefresh = new Promise<void>(resolve => { finishRefresh = resolve; });
  await page.route('**/api/admin/infinite-canvas/projects', async route => {
    if (++listRequests > 1) await pendingRefresh;
    await route.fulfill({
      headers: { 'access-control-allow-origin': '*' },
      json: projects,
    });
  });

  try {
    await page.goto('/?page=projects&kind=canvas');
    const library = page.frameLocator('iframe[title="画布库"]');
    const scroller = library.getByRole('main');
    const search = library.getByRole('textbox', { name: '搜索画布' });
    const cards = library.getByRole('article');
    await expect(library.getByText('共 120 个画布', { exact: true })).toBeVisible();
    await expect(cards).toHaveCount(24);
    await search.fill('星耀画布');
    await expect(library.getByText('找到 72 个 / 共 120 个', { exact: true })).toBeVisible();
    await library.getByRole('navigation', { name: '画布分页' }).getByTitle('下一页').click();
    await expect(cards.first()).toContainText('星耀画布 24');
    await expect(cards).toHaveCount(24);

    const target = library.getByRole('button', { name: '星耀画布 42', exact: true });
    await target.scrollIntoViewIfNeeded();
    const scrollTop = await scroller.evaluate(node => node.scrollTop);
    expect(scrollTop).toBeGreaterThan(0);
    await target.click();
    const editor = page.frameLocator('iframe[title="画布编辑器"]');
    await expect(editor.getByRole('region', { name: '画布编辑区' })).toBeVisible();
    await editor.getByRole('button', { name: '关闭画布' }).click();
    await Promise.race([
      editor.getByRole('dialog', { name: '保存画布？' }).getByRole('button', { name: '不保存' }).click(),
      library.getByRole('heading', { name: '全部画布' }).waitFor(),
    ]);
    await expect(search).toHaveValue('星耀画布');
    await expect(cards.first()).toContainText('星耀画布 24');
    await expect.poll(() => scroller.evaluate(node => node.scrollTop)).toBeCloseTo(scrollTop, 0);
    expect(listRequests).toBe(1);

    await target.click();
    await expect(editor.getByRole('region', { name: '画布编辑区' })).toBeVisible();
    await page.clock.setFixedTime(now + 61_000);
    await page.goBack();
    await expect.poll(() => listRequests).toBe(2);
    await expect(cards).toHaveCount(24);
    await expect(search).toHaveValue('星耀画布');
    await expect(cards.first()).toContainText('星耀画布 24');
    await expect.poll(() => scroller.evaluate(node => node.scrollTop)).toBeCloseTo(scrollTop, 0);
  } finally {
    finishRefresh();
  }
});

test('the crop dialog downloads on demand and opens again after canceling its loading state', async ({ page }) => {
  let releaseChunk!: () => void;
  const pending = new Promise<void>(resolve => { releaseChunk = resolve; });
  let cropRequested = false;
  await page.route(cropChunk, async route => {
    cropRequested = true;
    await pending;
    await route.continue();
  });
  try {
    const editor = await openImageCanvas(page);
    expect(cropRequested).toBe(false);
    const cropButton = editor.getByRole('button', { name: '裁剪并生成新节点' });
    await cropButton.click();
    const loading = editor.getByRole('dialog', { name: '正在加载工具' });
    await expect(loading).toBeVisible();
    await expect.poll(() => cropRequested).toBe(true);
    await loading.getByRole('button', { name: 'Close', exact: true }).click();
    await expect(loading).toBeHidden();
    releaseChunk();
    await cropButton.click();
    const crop = editor.getByRole('dialog', { name: '裁剪图片' });
    await expect(crop.getByRole('button', { name: '确认裁剪' })).toBeVisible();
    await crop.getByRole('button', { name: 'Close', exact: true }).click();
    await expect(crop).toBeHidden();

    const modelSettings = page.waitForRequest(request => /\/assets\/canvas-platform-settings-[\w-]+\.js$/.test(request.url()));
    await editor.getByRole('group', { name: '画布工具' }).getByRole('button', { name: '生成配置', exact: true }).click();
    await editor.getByRole('button', { name: /暂无可用(平台模型|模型)/ }).first().click();
    await modelSettings;
    await expect(editor.getByRole('dialog', { name: '画布模型配置' }).getByText('生图模型', { exact: true })).toBeVisible();
  } finally {
    releaseChunk();
  }
});

test('a failed editor chunk can be dismissed without losing the canvas', async ({ page }) => {
  await page.route(cropChunk, route => route.abort('failed'));
  const editor = await openImageCanvas(page);
  await editor.getByRole('button', { name: '裁剪并生成新节点' }).click();
  const failure = editor.getByRole('dialog', { name: '工具加载失败' });
  await expect(failure).toBeVisible();
  await failure.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(failure).toBeHidden();
  await editor.getByRole('button', { name: '查看节点信息' }).click();
  await expect(editor.getByRole('dialog', { name: '节点信息' })).toBeVisible();
});
