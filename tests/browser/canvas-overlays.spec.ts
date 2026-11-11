import { expect, test } from '@playwright/test';
import { mockCanvasPlatform } from './canvas-platform-fixture';

test('the canvas side panel collapses into a docked rail and reopens the chosen tab', async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 720 });
  await page.addInitScript(() => sessionStorage.setItem('xinghe-demo-auth', '1'));
  await mockCanvasPlatform(page);
  await page.goto('/?page=canvas&canvas=cv0');
  const editor = page.frameLocator('iframe[title="画布编辑器"]');
  const canvas = editor.getByRole('region', { name: '画布编辑区' });
  const sidebar = editor.getByRole('complementary', { name: '画布右侧面板' });
  const collapse = sidebar.getByRole('button', { name: '收起面板' });
  const expand = sidebar.getByRole('button', { name: '展开面板' });
  const assets = sidebar.getByRole('button', { name: '资产', exact: true });
  const elements = sidebar.getByRole('button', { name: '元素', exact: true });
  const search = sidebar.getByRole('textbox', { name: '搜索节点' });
  await expect(search).toBeVisible();
  const handle = await sidebar.getByRole('button', { name: '调整右侧面板宽度' }).boundingBox();
  if (!handle) throw new Error('找不到面板拖动手柄');
  const startX = handle.x + handle.width / 2;
  await page.mouse.move(startX, handle.y + 200);
  await page.mouse.down();
  await page.mouse.move(startX - 50, handle.y + 200, { steps: 4 });
  await page.mouse.up();
  const expandedWidth = await sidebar.evaluate(element => element.clientWidth);
  const initialCanvasWidth = await canvas.evaluate(element => element.clientWidth);
  expect(expandedWidth).toBeGreaterThan(280);

  await collapse.press('Enter');
  await expect(expand).toBeFocused();
  await expect(expand).toHaveAttribute('aria-expanded', 'false');
  await expect(search).toBeHidden();
  await expect(assets).toBeVisible();
  await expect(elements).toBeVisible();
  await expect.poll(() => sidebar.evaluate(element => element.offsetWidth)).toBe(48);
  expect(await sidebar.evaluate(element => element.getBoundingClientRect().right)).toBe(1200);
  expect(await canvas.evaluate(element => element.clientWidth)).toBeGreaterThan(initialCanvasWidth);

  await page.keyboard.press('Tab');
  await expect(elements).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(assets).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(assets).toBeFocused();
  await expect(assets).toHaveAttribute('aria-pressed', 'true');
  await expect(sidebar.getByText('暂无本地资产')).toBeVisible();
  await expect.poll(() => sidebar.evaluate(element => element.clientWidth)).toBe(expandedWidth);
  await collapse.click();
  await expand.click();
  await expect(assets).toHaveAttribute('aria-pressed', 'true');
  await expect(sidebar.getByText('暂无本地资产')).toBeVisible();

  await collapse.click();
  await page.reload();
  await expect(expand).toBeVisible();
  await elements.click();
  await expect(search).toBeVisible();
  await expect.poll(() => sidebar.evaluate(element => element.clientWidth)).toBe(expandedWidth);

  await page.setViewportSize({ width: 375, height: 720 });
  await expect(collapse).toBeInViewport({ ratio: 1 });
  await expect.poll(() => canvas.evaluate(element => element.clientWidth)).toBeGreaterThanOrEqual(96);
  await collapse.click();
  await expect(expand).toBeVisible();
  expect(await sidebar.evaluate(element => element.getBoundingClientRect().right)).toBe(375);
});

test('the canvas toolbar switches between selecting nodes and panning without changing the shortcuts', async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 720 });
  await page.addInitScript(() => sessionStorage.setItem('xinghe-demo-auth', '1'));
  await mockCanvasPlatform(page);
  await page.route('**/api/admin/infinite-canvas/projects/cv0', route => route.fulfill({
    headers: { 'access-control-allow-origin': '*' },
    json: { id: 'cv0', title: '测试画布', payload: {
      nodes: [{ id: 'selectable-node', type: 'text', title: '分镜', width: 210, height: 140,
        position: { x: 240, y: 185 }, metadata: { content: '分镜内容' } }],
      connections: [], backgroundMode: 'dots', viewport: { x: 0, y: 0, k: 1 },
    } },
  }));
  await page.goto('/?page=canvas&canvas=cv0');
  const editor = page.frameLocator('iframe[title="画布编辑器"]');
  const canvas = editor.getByRole('region', { name: '画布编辑区' });
  const toolbar = editor.getByRole('group', { name: '画布工具' });
  const select = toolbar.getByRole('button', { name: '选择', exact: true });
  const move = toolbar.getByRole('button', { name: '移动', exact: true });
  const selectedRow = editor.getByRole('complementary', { name: '画布右侧面板' }).getByRole('button', { name: '分镜', exact: true });
  const node = canvas.locator('[data-node-id="selectable-node"]');
  const drag = async (fromX: number, fromY: number, toX: number, toY: number, button: 'left' | 'middle' = 'left') => {
    await page.mouse.move(fromX, fromY);
    await page.mouse.down({ button });
    await page.mouse.move(toX, toY, { steps: 8 });
    await page.mouse.up({ button });
  };

  await expect(select).toHaveAttribute('aria-pressed', 'true');
  await expect(node).toBeVisible();
  const nodeBox = await node.boundingBox();
  if (!nodeBox) throw new Error('找不到测试节点');
  await drag(nodeBox.x - 32, nodeBox.y - 32, nodeBox.x + nodeBox.width + 24, nodeBox.y + nodeBox.height + 24);
  await expect(selectedRow).toHaveAttribute('aria-pressed', 'true');
  await expect(toolbar.getByRole('button', { name: '删除选中' })).toHaveCount(0);
  const worldPosition = await node.evaluate(element => element.style.transform);

  await move.press('Space');
  await expect(move).toHaveAttribute('aria-pressed', 'true');
  await expect(canvas).toBeFocused();
  const x = nodeBox.x + nodeBox.width / 2;
  const y = nodeBox.y + nodeBox.height / 2;
  await drag(x, y, x + 90, y + 30);
  await expect.poll(async () => (await node.boundingBox())?.x).toBeCloseTo(nodeBox.x + 90, 0);
  expect(await node.evaluate(element => element.style.transform)).toBe(worldPosition);
  await expect(selectedRow).toHaveAttribute('aria-pressed', 'true');

  await select.click();
  await expect(select).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.down('Space');
  await drag(150, 130, 190, 155);
  await page.keyboard.up('Space');
  await expect.poll(async () => (await node.boundingBox())?.x).toBeCloseTo(nodeBox.x + 130, 0);
  await drag(150, 130, 180, 155, 'middle');
  await expect.poll(async () => (await node.boundingBox())?.x).toBeCloseTo(nodeBox.x + 160, 0);
  expect(await node.evaluate(element => element.style.transform)).toBe(worldPosition);
  await canvas.press('Delete');
  await expect(node).toHaveCount(0);
});

test('multi-node dragging commits the release position and the topmost target group in one undo step', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.addInitScript(() => sessionStorage.setItem('xinghe-demo-auth', '1'));
  await mockCanvasPlatform(page);
  await page.route('**/api/admin/infinite-canvas/projects/cv0', route => {
    if (route.request().method() !== 'GET') return route.fallback();
    return route.fulfill({
      headers: { 'access-control-allow-origin': '*' },
      json: { id: 'cv0', title: '拖动测试', payload: {
        nodes: [
          { id: 'first', type: 'text', title: '第一张分镜', width: 120, height: 90, position: { x: 210, y: 195 } },
          { id: 'second', type: 'text', title: '第二张分镜', width: 120, height: 90, position: { x: 365, y: 195 } },
          { id: 'group-under', type: 'group', title: '底层分组', width: 430, height: 360, position: { x: 520, y: 175 } },
          { id: 'group-over', type: 'group', title: '上层分组', width: 430, height: 360, position: { x: 520, y: 175 } },
        ],
        connections: [], backgroundMode: 'dots', viewport: { x: 20, y: 20, k: 1 },
      } },
    });
  });
  await page.goto('/?page=canvas&canvas=cv0');
  const editor = page.frameLocator('iframe[title="画布编辑器"]');
  const canvas = editor.getByRole('region', { name: '画布编辑区' });
  const first = canvas.locator('[data-node-id="first"]');
  const second = canvas.locator('[data-node-id="second"]');
  await expect(first).toBeVisible();
  await first.click();
  await second.click({ modifiers: ['Shift'] });

  const firstBox = await first.boundingBox();
  if (!firstBox) throw new Error('找不到拖动测试节点');
  const x = firstBox.x + firstBox.width / 2;
  const y = firstBox.y + firstBox.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await canvas.evaluate((element, { x, y }) => {
    const frame = element.ownerDocument.defaultView!;
    frame.dispatchEvent(new MouseEvent('mousemove', { clientX: x + 70, clientY: y + 10, buttons: 1 }));
    frame.dispatchEvent(new PointerEvent('pointerup', { clientX: x + 355, clientY: y + 60 }));
  }, { x, y });
  await page.mouse.up();
  await expect(first).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 565, 255)');
  await expect(second).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 720, 255)');

  const undo = editor.getByRole('button', { name: '撤销', exact: true });
  await undo.click();
  await expect(first).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 210, 195)');
  await expect(second).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 365, 195)');
  await expect(undo).toBeDisabled();
  await editor.getByRole('button', { name: '重做', exact: true }).click();
  await expect(first).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 565, 255)');
  const saved = page.waitForRequest(request => request.method() === 'PUT' && request.url().endsWith('/infinite-canvas/projects/cv0'));
  await editor.getByRole('button', { name: '保存', exact: true }).click();
  const nodes = (await saved).postDataJSON().payload.nodes;
  expect(nodes.filter((node: { id: string }) => ['first', 'second'].includes(node.id))).toEqual([
    expect.objectContaining({ id: 'first', metadata: expect.objectContaining({ groupId: 'group-over' }) }),
    expect.objectContaining({ id: 'second', metadata: expect.objectContaining({ groupId: 'group-over' }) }),
  ]);
});

test('node details keep JSON readable, copyable and clear of the support overlay', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.addInitScript(() => sessionStorage.setItem('xinghe-demo-auth', '1'));
  await mockCanvasPlatform(page);
  const image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lL0AAAAASUVORK5CYII=';
  const model = 'platform-image-' + 'long-model-name-'.repeat(24);
  const title = `微信图片_${'20261012165715'.repeat(12)}.png`;
  await page.route('**/api/admin/infinite-canvas/projects/cv0', route => {
    if (route.request().method() !== 'GET') return route.fallback();
    return route.fulfill({
      headers: { 'access-control-allow-origin': '*' },
      json: { id: 'cv0', title: '测试画布', payload: {
        nodes: [{ id: 'image-detail', type: 'image', title, width: 260, height: 180,
          position: { x: 180, y: 175 }, metadata: { content: image, model, status: 'success', prompt: '使用光影参考' } }],
        connections: [], backgroundMode: 'dots', viewport: { x: 0, y: 0, k: 1 },
      } },
    });
  });
  await page.setViewportSize({ width: 1000, height: 640 });
  await page.goto('/?page=canvas&canvas=cv0');
  const editor = page.frameLocator('iframe[title="画布编辑器"]');
  const dock = editor.getByRole('group', { name: '画布工具' });
  await expect(dock.getByRole('button', { name: '生成配置' })).toHaveText('配置');
  await expect(dock.getByRole('button', { name: '画布外观' })).toHaveCount(0);

  const sidebar = editor.getByRole('complementary', { name: '画布右侧面板' });
  const rowTitle = sidebar.getByText(title, { exact: true });
  await expect(rowTitle).toHaveAttribute('title', title);
  await expect(rowTitle).toHaveCSS('text-overflow', 'ellipsis');
  expect(await rowTitle.evaluate(element => {
    const list = element.closest('.thin-scrollbar')!;
    return element.scrollWidth > element.clientWidth && list.scrollWidth <= list.clientWidth;
  })).toBe(true);
  await expect(sidebar.getByRole('button', { name: '放大预览' })).toBeInViewport();

  const support = page.locator('#support-feedback-trigger');
  await expect(support).toBeVisible();
  const node = editor.locator('[data-node-id="image-detail"]');
  const nodeTitle = node.getByText(title, { exact: true });
  await expect(nodeTitle).toHaveCSS('overflow', 'hidden');
  expect(await nodeTitle.evaluate(element => element.scrollWidth > element.clientWidth)).toBe(true);
  await node.click();
  await editor.getByRole('button', { name: '查看节点信息' }).click();

  const detail = editor.getByRole('dialog', { name: '节点信息' });
  await expect(detail.getByText('节点 ID', { exact: true })).toBeVisible();
  await expect(detail.getByText('完成', { exact: true })).toBeVisible();
  await expect(support).toBeHidden();
  await detail.getByRole('button', { name: 'Close', exact: true }).press('Delete');
  await expect(node).toHaveCount(1);

  await detail.getByText('JSON', { exact: true }).click();
  const code = detail.locator('pre[aria-label="节点 JSON"]');
  await expect(code).toContainText(model);
  await expect(code).not.toContainText('data:image');
  expect(await code.locator('span').count()).toBeGreaterThan(10);
  await page.setViewportSize({ width: 375, height: 720 });
  await expect(code).toBeInViewport({ ratio: 1 });
  expect(await code.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);

  const displayedJson = await code.textContent();
  await detail.getByRole('button', { name: '复制 JSON' }).click();
  await expect.poll(async () => {
    const value = await detail.evaluate(() => navigator.clipboard.readText());
    return value.replace(/\r\n/g, '\n');
  }).toBe(displayedJson);

  await page.keyboard.press('Escape');
  await expect(detail).toBeHidden();
  await expect(support).toBeVisible();

  const titleTrigger = editor.getByRole('button', { name: '测试画布', exact: true });
  const rename = editor.getByRole('menuitem', { name: '重命名画布', exact: true });
  await titleTrigger.getByText('测试画布', { exact: true }).click();
  await expect(rename).toBeVisible();
  await expect(titleTrigger).toHaveAttribute('aria-expanded', 'true');
  await expect(editor.getByRole('menuitem', { name: /^(画布配置|快捷键)$/ })).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(rename).toBeHidden();
  await titleTrigger.locator('svg').click();
  await rename.click();
  const nameInput = editor.getByRole('textbox', { name: '画布名称' });
  await expect(nameInput).toBeFocused();
  await nameInput.fill('重命名回归画布');
  await nameInput.press('Enter');
  await expect(editor.getByRole('button', { name: '重命名回归画布', exact: true })).toHaveAttribute('aria-expanded', 'false');
});
