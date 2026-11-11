import { expect, test } from '@playwright/test';
import { mockCanvasPlatform } from './canvas-platform-fixture';

test('canvas audio generation submits the platform request and resumes polling', async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('xinghe-demo-auth', '1'));
  await mockCanvasPlatform(page);
  await page.goto('/?page=canvas&canvas=cv0');
  const editor = page.frameLocator('iframe[title="画布编辑器"]');
  const region = editor.getByRole('region', { name: '画布编辑区' });
  await expect(region).toBeVisible();
  await expect(editor.getByText('提示词库', { exact: true })).toHaveCount(0);
  await editor.getByRole('button', { name: '音频', exact: true }).click();
  await region.locator('[contenteditable="true"]').fill('请生成四秒雨声');
  const request = page.waitForRequest((item) => item.method() === 'POST' &&
    new URL(item.url()).pathname.endsWith('/infinite-canvas/audio/tasks'));
  const poll = page.waitForResponse((item) => item.ok() &&
    new URL(item.url()).pathname.includes('/infinite-canvas/audio/tasks/'));
  await region.getByRole('button', { name: '生成', exact: true }).click();
  expect((await request).postDataJSON()).toMatchObject({
    modelId: 23, projectId: 'cv0', prompt: '请生成四秒雨声',
  });
  await poll;
  await expect(region.locator('audio[src="https://canvas-fixture.invalid/test.mp3"]')).toHaveCount(1);
});
