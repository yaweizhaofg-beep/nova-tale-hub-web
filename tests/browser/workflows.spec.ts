import { expect, test, type Page } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('**/*.mp4', (route) => route.abort());
});

async function demoSession(page: Page) {
  await page.addInitScript(() => sessionStorage.setItem('xinghe-demo-auth', '1'));
}

test('guest deep link returns to the canvas list with its query parameters after login', async ({
  page,
}) => {
  await page.goto('/?page=projects&kind=canvas&create=1');
  await expect(page).toHaveURL(/page=login/);
  await page.getByPlaceholder('your@email.com').fill('demo@example.com');
  await page.locator('input[type="password"]').fill('demo-password');
  await page.getByRole('button', { name: '登录', exact: true }).click();
  await expect(page).toHaveURL(/page=projects&kind=canvas&create=1/);
  await expect(page.getByRole('dialog', { name: '新建画布' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading', { name: '全部画布' })).toBeVisible();
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
  await page.getByRole('option', { name: '失败', exact: true }).click();
  await expect(page).toHaveURL(/status=%E5%A4%B1%E8%B4%A5/);
  await expect(status).toHaveAttribute('data-value', '失败');
  await page.goBack();
  await expect(status).toHaveAttribute('data-value', 'all');
  await page.goForward();
  await expect(status).toHaveAttribute('data-value', '失败');
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
  await select.click();
  await expect(page.getByRole('listbox')).toBeVisible();
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

test('canvas context menu handles Escape and preserves node creation', async ({ page }) => {
  await demoSession(page);
  await page.goto('/?page=canvas');
  const canvas = page.getByRole('region', { name: '画布编辑区' });
  await canvas.focus();
  await page.keyboard.press('Shift+F10');
  const menu = page.getByRole('menu', { name: '添加节点' });
  await expect(menu).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(menu).toHaveCount(0);
  await expect(canvas).toBeFocused();
  await canvas.click({ button: 'right', position: { x: 18, y: 18 } });
  await menu.getByRole('menuitem', { name: /文本/ }).click();
  await expect(menu).toHaveCount(0);
  await expect(canvas.getByText('新建文本', { exact: true })).toBeVisible();
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
