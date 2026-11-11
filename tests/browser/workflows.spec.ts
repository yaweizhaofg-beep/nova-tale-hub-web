import { expect, test, type Page } from '@playwright/test';
import { mockCanvasPlatform } from './canvas-platform-fixture';

test.beforeEach(async ({ page }) => {
  await page.route('**/*.mp4', (route) => route.abort());
});

async function demoSession(page: Page) {
  await page.addInitScript(() => sessionStorage.setItem('xinghe-demo-auth', '1'));
}

test('guest deep link returns to the canvas list with its query parameters after login', async ({
  page,
}) => {
  await mockCanvasPlatform(page);
  await page.goto('/?page=projects&kind=canvas&create=1');
  await expect(page).toHaveURL(/page=login/);
  await page.getByPlaceholder('your@email.com').fill('demo@example.com');
  await page.locator('input[type="password"]').fill('demo-password');
  await page.getByRole('button', { name: '登录', exact: true }).click();
  await expect(page).toHaveURL(/page=projects&kind=canvas&create=1/);
  const library = page.frameLocator('iframe[title="画布库"]');
  await expect(library.getByRole('dialog', { name: '新建画布' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(library.getByRole('heading', { name: '全部画布' })).toBeVisible();
});

test('leaving login cancels the pending demo session and navigation', async ({ page }) => {
  await page.goto('/?page=login');
  await page.getByPlaceholder('your@email.com').fill('demo@example.com');
  await page.locator('input[type="password"]').fill('demo-password');
  await page.getByRole('button', { name: '登录', exact: true }).click();
  await page.getByRole('button', { name: /返回首页/ }).click();
  await expect(page).toHaveURL(/page=landing/);
  await expect
    .poll(async () => {
      await page.waitForTimeout(1100);
      return page.evaluate(() => sessionStorage.getItem('xinghe-demo-auth'));
    })
    .toBe(null);
  await expect(page).toHaveURL(/page=landing/);
});

test('task filters use the browser history and the shared select', async ({ page }) => {
  await demoSession(page);
  await page.goto('/?page=team-tasks');
  const status = page.getByRole('combobox', { name: '状态', exact: true });
  await status.focus();
  await page.keyboard.press('Enter');
  await page.keyboard.press('Home');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('option', { name: '失败', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/status=%E5%A4%B1%E8%B4%A5/);
  await expect(status).toHaveAttribute('data-value', '失败');
  await page.goBack();
  await expect(status).toHaveAttribute('data-value', 'all');
  await page.goForward();
  await expect(status).toHaveAttribute('data-value', '失败');
});

test('switching task dropdowns by pointer preserves numeric and empty filter values', async ({
  page,
}) => {
  await demoSession(page);
  await page.goto('/?page=team-tasks');
  const member = page.getByRole('combobox', { name: '成员', exact: true });
  const status = page.getByRole('combobox', { name: '状态', exact: true });
  await member.click();
  const members = page.getByRole('listbox', { name: '成员', exact: true });
  await expect(members).toBeVisible();
  await status.click();
  await expect(members).toHaveCount(0);
  await expect(page.getByRole('listbox', { name: '状态', exact: true })).toBeVisible();

  await member.click();
  await members.locator('[role="option"][data-value="1"]').click();
  await expect(member).toHaveAttribute('data-value', '1');
  await expect(page).toHaveURL((url) => url.searchParams.get('member') === '1');
  await member.click();
  await members.getByRole('option', { name: '全部成员', exact: true }).click();
  await expect(member).toHaveText('全部成员', { useInnerText: true });
  await expect(member).not.toHaveAttribute('data-placeholder');
  await expect(page).toHaveURL((url) => !url.searchParams.has('member'));
  await member.click();
  await expect(members.getByRole('option', { name: '全部成员', selected: true })).toBeVisible();
});

test('Escape closes a select before its parent dialog and restores trigger focus', async ({
  page,
}) => {
  await demoSession(page);
  await page.goto('/?page=workspace');
  const trigger = page.getByTitle('消息通知');
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: '任务通知' });
  const select = dialog.getByRole('combobox', { name: '通知筛选' });
  await select.focus();
  await page.keyboard.press('Enter');
  const list = dialog.getByRole('listbox', { name: '通知筛选' });
  await expect(list.getByRole('option', { name: '全部任务' })).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(list.getByRole('option', { name: '报错任务' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(select).toHaveAttribute('data-value', 'error');
  await expect(select).toBeFocused();
  await select.click();
  await expect(list).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('listbox')).toHaveCount(0);
  await expect(dialog).toBeVisible();
  await expect(select).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test('closing the asset dialog discards a pending parse', async ({ page }) => {
  await demoSession(page);
  await page.goto('/?page=team-assets');
  await page.getByRole('button', { name: '新建资产', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: '新建资产' });
  await dialog.getByPlaceholder(/每行一个角色/).fill('新角色：测试');
  await dialog.getByRole('button', { name: '开始解析' }).click();
  await expect(dialog.getByText('AI 解析中', { exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await page.getByRole('button', { name: '新建资产', exact: true }).click();
  await expect(dialog.getByPlaceholder(/每行一个角色/)).toHaveValue('');
  await page.waitForTimeout(1550);
  await expect(dialog.getByRole('button', { name: '开始解析' })).toBeVisible();
});

test('recharge refreshes the header balance in the same view', async ({ page }) => {
  await demoSession(page);
  await page.clock.setFixedTime(new Date('2026-11-09T08:00:00+08:00'));
  await page.goto('/?page=membership');
  const header = page.locator('.studio-header');
  await expect(header).toContainText('8,250');
  await page.locator('.membership-recharge-footer').getByRole('button').click();
  const order = page.getByRole('dialog', { name: '确认订单' });
  await order.getByRole('checkbox').check();
  await order.getByRole('button', { name: /模拟支付/ }).click();
  await expect(header).toContainText('10,240');
});

test('deleting an asset leaves assets with the same local ID in other projects visible', async ({
  page,
}) => {
  await demoSession(page);
  await page.route('https://images.unsplash.com/**', (route) => route.abort());
  await page.goto('/?page=team-assets');
  await page.getByText('镜像', { exact: true }).click();
  await expect(page.getByRole('heading', { name: '镜像', exact: true })).toBeVisible();
  const card = page.getByText('陈默', { exact: true }).locator('xpath=../..');
  await card.getByTitle('删除').click();
  await page.getByRole('dialog', { name: '确认删除' }).getByRole('button', { name: '删除', exact: true }).click();
  await expect(page.getByText('陈默', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: '返回团队资产' }).click();
  await page.getByText('星坠', { exact: true }).click();
  await expect(page.getByText('宁远', { exact: true })).toBeVisible();
});

test('unknown query pages and paths show 404 without requiring a session', async ({ page }) => {
  for (const destination of ['/?page=missing', '/missing/deep-link']) {
    await page.goto(destination);
    await expect(page.getByRole('heading', { name: '页面不存在' })).toBeVisible();
    await page.getByRole('button', { name: '返回首页' }).click();
    await expect(page).toHaveURL(/\/\?page=landing$/);
  }
});

test('the workspace creation menu works with a keyboard and restores focus', async ({ page }) => {
  await demoSession(page);
  await page.goto('/?page=workspace');
  const trigger = page.getByRole('button', { name: '开始创作' });
  await trigger.focus();
  await page.keyboard.press('ArrowDown');
  const menu = page.getByRole('menu', { name: '开始创作' });
  await expect(menu).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(menu).toHaveCount(0);
  await expect(trigger).toBeFocused();

  await page.keyboard.press('ArrowDown');
  await menu.getByRole('menuitem', { name: /剧目创作/ }).click();
  const spacePicker = page.getByRole('dialog', { name: '切换工作空间' });
  await expect(spacePicker).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(spacePicker).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test('canvas project authenticates, opens the editor and saves an edited graph', async ({ page }) => {
  await demoSession(page);
  const credential = await mockCanvasPlatform(page, false);
  await page.goto('/?page=canvas&canvas=cv0');
  const editor = page.frameLocator('iframe[title="画布编辑器"]');
  await editor.getByLabel('平台访问凭证').fill(credential);
  await editor.getByRole('button', { name: '连接画布' }).click();
  const canvas = editor.getByRole('region', { name: '画布编辑区' });
  await expect(canvas).toBeVisible();
  await expect(page).toHaveURL(/page=canvas&canvas=cv0$/);

  await canvas.focus();
  await page.keyboard.press('Shift+F10');
  await expect(editor.getByText('选择节点', { exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(editor.getByText('选择节点', { exact: true })).toHaveCount(0);
  await canvas.click({ button: 'right', position: { x: 90, y: 90 } });
  await editor.getByRole('group', { name: '选择节点' }).getByRole('button', { name: /^文本/ }).click();
  await expect(canvas.locator('[data-node-id]')).toHaveCount(1);

  const saved = page.waitForRequest((request) => request.method() === 'PUT' &&
    new URL(request.url()).pathname.endsWith('/infinite-canvas/projects/cv0'));
  await editor.getByRole('button', { name: '保存', exact: true }).click();
  expect((await saved).postDataJSON().payload.nodes).toHaveLength(1);
  await expect(editor.getByText('画布已保存到云端', { exact: true })).toBeVisible();

  await editor.getByRole('button', { name: '资产', exact: true }).click();
  const assets = page.waitForRequest((request) => request.method() === 'GET' &&
    new URL(request.url()).pathname.endsWith('/infinite-canvas/assets'));
  await editor.getByText('平台', { exact: true }).click();
  expect(new URL((await assets).url()).searchParams.get('staffId')).toBe('42');
});

test('creating a canvas in the library preserves the new draft across the editor route', async ({ page }) => {
  await demoSession(page);
  await mockCanvasPlatform(page);
  await page.goto('/?page=projects&kind=canvas&create=1');
  const library = page.frameLocator('iframe[title="画布库"]');
  const dialog = library.getByRole('dialog', { name: '新建画布' });
  await dialog.getByRole('textbox', { name: '画布名称' }).fill('新建画布回归');
  await dialog.getByRole('button', { name: '创建画布' }).click();
  await expect(page).toHaveURL(/page=canvas&canvas=[A-Za-z0-9_-]+$/);
  const editor = page.frameLocator('iframe[title="画布编辑器"]');
  await expect(editor.getByRole('region', { name: '画布编辑区' })).toBeVisible();
  await expect(editor.getByRole('button', { name: '新建画布回归', exact: true })).toBeVisible();
});

test('the canvas library deletes local drafts without sending a cloud delete', async ({ page }) => {
  await demoSession(page);
  await mockCanvasPlatform(page);
  await page.goto('/?page=projects&kind=canvas&create=1');
  const library = page.frameLocator('iframe[title="画布库"]');
  const dialog = library.getByRole('dialog', { name: '新建画布' });
  await dialog.getByRole('textbox', { name: '画布名称' }).fill('本地草稿');
  await dialog.getByRole('button', { name: '创建画布' }).click();
  const editor = page.frameLocator('iframe[title="画布编辑器"]');
  await editor.getByRole('button', { name: '关闭画布' }).click();
  const savePrompt = editor.getByRole('dialog', { name: '保存画布？' });
  await Promise.race([
    savePrompt.getByRole('button', { name: '不保存' }).click(),
    library.getByRole('heading', { name: '全部画布' }).waitFor(),
  ]);
  const local = library.getByRole('article').filter({ hasText: '本地草稿' });
  const remote = library.getByRole('article').filter({ hasText: '云端测试画布' });
  await expect(local).toBeVisible();
  const deletes: string[] = [];
  page.on('request', (request) => {
    if (request.method() === 'DELETE') deletes.push(new URL(request.url()).pathname);
  });
  const search = library.getByRole('textbox', { name: '搜索画布' });
  await search.fill('草稿');
  await expect(remote).toHaveCount(0);
  await local.getByRole('button', { name: '删除' }).click();
  const deletion = library.getByRole('dialog', { name: '删除画布？' });
  await deletion.getByRole('button', { name: '删除', exact: true }).click();
  await expect(local).toHaveCount(0);
  expect(deletes).toEqual([]);

  await search.clear();
  await remote.getByRole('button', { name: '删除' }).click();
  await deletion.getByRole('button', { name: '删除', exact: true }).click();
  await expect(remote).toHaveCount(0);
  expect(deletes).toEqual(['/api/admin/infinite-canvas/projects/cv0']);
});

test('asset prompt editor closes independently and restores focus to the detail view', async ({ page }) => {
  await demoSession(page);
  await page.route('https://images.unsplash.com/**', route => route.abort());
  await page.goto('/?page=team-assets');
  await page.getByText('镜像', { exact: true }).click();
  await page.getByText('方远', { exact: true }).click();
  const detail = page.getByRole('dialog', { name: '资产详情' });
  const trigger = detail.getByRole('button', { name: '打开提示词编辑器' });
  await trigger.click();
  const editor = page.getByRole('dialog', { name: '提示词编辑' });
  await expect(editor.getByRole('textbox')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(editor).toHaveCount(0);
  await expect(detail).toBeVisible();
  await expect(trigger).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(detail).toHaveCount(0);
});

test('storage expansion keeps its quote and restores focus after dismissal', async ({ page }) => {
  await demoSession(page);
  await page.goto('/?page=upgrade');
  const trigger = page.getByRole('button', { name: '扩容存储' });
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: '扩容存储' });
  await expect(dialog.getByText('付款金额')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
});
