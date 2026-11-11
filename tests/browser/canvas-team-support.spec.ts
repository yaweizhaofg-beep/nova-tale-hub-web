import { expect, test } from '@playwright/test';
import { mockCanvasPlatform } from './canvas-platform-fixture';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('xinghe-demo-auth', '1'));
  await page.route('**/*.mp4', route => route.abort());
  await mockCanvasPlatform(page);
});

test('canvas team opens the existing member page through the unsaved canvas guard', async ({ page }) => {
  await page.goto('/?page=canvas&canvas=cv0');
  const editor = page.frameLocator('iframe[title="画布编辑器"]');
  const canvas = editor.getByRole('region', { name: '画布编辑区' });
  const team = editor.getByRole('button', { name: '团队', exact: true });
  await expect(canvas).toBeVisible();
  await team.click();
  const members = editor.getByRole('dialog', { name: '团队成员' });
  await expect(members.getByText('星耀漫剧工作室')).toBeVisible();
  await expect(members.getByText('赵雅薇')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(members).toBeHidden();
  await expect(team).toBeFocused();

  await canvas.click({ button: 'right', position: { x: 160, y: 120 } });
  await editor.getByRole('group', { name: '选择节点' }).getByRole('button', { name: /^文本/ }).click();
  const sidebar = editor.getByRole('complementary');
  const search = sidebar.getByRole('textbox', { name: '搜索节点' });
  await search.fill('不存在的节点');
  await expect(sidebar.getByText('没有匹配的节点')).toBeVisible();
  await search.clear();
  await expect(sidebar.getByRole('button', { name: '文本', exact: true })).toBeVisible();
  await sidebar.getByRole('button', { name: '资产', exact: true }).click();
  await expect(sidebar.getByText('暂无本地资产')).toBeVisible();
  await sidebar.getByText('平台', { exact: true }).click();
  await expect(sidebar.getByRole('textbox', { name: '搜索平台资产' })).toBeVisible();

  await team.click();
  await members.getByRole('button', { name: '管理团队成员' }).click();
  const save = editor.getByRole('dialog', { name: '保存画布？' });
  await expect(save).toBeVisible();
  await save.getByRole('button', { name: '不保存' }).click();
  await expect(page).toHaveURL(/page=team&tab=members$/);
});

test('support can cross the canvas while dragging and reopens beside its saved position', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/?page=canvas&canvas=cv0');
  const trigger = page.getByRole('button', { name: '客服与反馈', exact: true });
  const dialog = page.getByRole('dialog', { name: '客服与反馈' });
  await expect(trigger).toBeVisible();
  const original = (await trigger.boundingBox())!;
  await page.mouse.move(original.x + original.width / 2, original.y + 20);
  await page.mouse.down();
  await page.mouse.move(405, 285, { steps: 12 });
  await page.mouse.up();
  await expect(dialog).toHaveCount(0);
  const moved = (await trigger.boundingBox())!;
  expect(moved.x).toBeLessThan(original.x - 500);
  expect(moved.y).toBeLessThan(original.y - 300);

  await trigger.click();
  await expect(dialog).toBeInViewport({ ratio: 1 });
  await dialog.getByRole('button', { name: '意见建议' }).click();
  await dialog.getByRole('textbox', { name: '反馈内容' }).fill('希望可以调整客服位置');
  await dialog.getByLabel('上传截图').setInputFiles({
    name: '画布截图.png',
    mimeType: 'image/png',
    buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lL0AAAAASUVORK5CYII=', 'base64'),
  });
  await expect(dialog.getByRole('img', { name: '画布截图.png' })).toBeVisible();
  await dialog.getByRole('button', { name: '提交反馈' }).click();
  await dialog.getByRole('button', { name: '我的反馈' }).click();
  await expect(dialog.getByText('希望可以调整客服位置')).toBeVisible();
  await expect(dialog.getByRole('img', { name: '画布截图.png' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();

  await page.reload();
  await expect(trigger).toBeVisible();
  await expect.poll(async () => (await trigger.boundingBox())?.x).toBeCloseTo(moved.x, 0);
  await page.setViewportSize({ width: 375, height: 812 });
  await expect(trigger).toBeInViewport({ ratio: 1 });
  await trigger.click();
  await expect(dialog).toBeInViewport({ ratio: 1 });
});

test.describe('touch input', () => {
  test.use({ hasTouch: true, viewport: { width: 375, height: 812 } });

  test('support follows a touch drag and opens only after a tap', async ({ page }) => {
    await page.goto('/?page=canvas&canvas=cv0');
    const editor = page.frameLocator('iframe[title="画布编辑器"]');
    await expect(editor.getByRole('region', { name: '画布编辑区' })).toBeVisible();
    const trigger = page.getByRole('button', { name: '客服与反馈', exact: true });
    const dialog = page.getByRole('dialog', { name: '客服与反馈' });
    await expect(trigger).toBeVisible();
    const before = (await trigger.boundingBox())!;
    const input = await page.context().newCDPSession(page);
    try {
      await input.send('Input.dispatchTouchEvent', {
        type: 'touchStart', touchPoints: [{ x: before.x + before.width / 2, y: before.y + 20 }],
      });
      await input.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 75, y: 190 }] });
      await input.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await expect.poll(async () => (await trigger.boundingBox())?.y ?? before.y).toBeLessThan(220);
      await expect(trigger).toHaveAttribute('data-dragging', 'false');
      await expect(dialog).toHaveCount(0);
      const after = (await trigger.boundingBox())!;
      await input.send('Input.dispatchTouchEvent', {
        type: 'touchStart', touchPoints: [{ x: after.x + after.width / 2, y: after.y + 20 }],
      });
      await input.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await expect(dialog).toBeInViewport({ ratio: 1 });
    } finally {
      await input.detach();
    }
  });
});
