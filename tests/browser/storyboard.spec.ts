import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';

async function openNewProject(page: Page) {
  await page.addInitScript(() => sessionStorage.setItem('xinghe-demo-auth', '1'));
  await page.goto('/?page=new-project');
}

async function createStoryboard(page: Page, name: string, shots: number) {
  await page.getByRole('textbox', { name: '剧目名称' }).fill(name);
  await page.getByLabel('选择剧本文件').setInputFiles({
    name: '星耀.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('演示剧本'),
  });
  await page.getByRole('spinbutton', { name: '目标分镜数' }).fill(String(shots));
  await page.getByRole('button', { name: /开始拆分/ }).click();
  await expect(page).toHaveURL(
    (url) =>
      url.searchParams.get('page') === 'storyboard-shots' && url.searchParams.has('storyboardId'),
  );
}

test('Tab moves through the project form without a focus frame', async ({ page }) => {
  await openNewProject(page);
  const name = page.getByRole('textbox', { name: '剧目名称' });
  const border = await name.evaluate((element) => getComputedStyle(element).borderTopColor);
  const breadcrumb = page.getByRole('button', { name: '剧目创作' });
  await breadcrumb.focus();
  await expect(breadcrumb).toHaveCSS('outline-style', 'none');
  await page.keyboard.press('Tab');
  await expect(name).toBeFocused();
  await expect(name).toHaveCSS('outline-style', 'none');
  await expect(name).toHaveCSS('border-top-color', border);
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('选择剧本文件')).toBeFocused();
  await expect(page.locator('.studio-dropzone')).toHaveCSS('outline-style', 'none');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('spinbutton', { name: '目标分镜数' })).toBeFocused();
  await page.keyboard.press('Tab');
  const slider = page.getByRole('slider', { name: '调整目标分镜数' });
  await expect(slider).toBeFocused();
  await expect(slider).toHaveCSS('outline-style', 'none');
  await page.keyboard.press('Tab');
  const model = page.getByRole('combobox', { name: '生成模型' });
  await expect(model).toBeFocused();
  await expect(model).toHaveCSS('outline-style', 'none');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('listbox', { name: '生成模型' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(model).toBeFocused();
});

test('demo splitting opens one editable list and saves edits across reload', async ({ page }) => {
  await openNewProject(page);
  await createStoryboard(page, '星耀', 7);
  await expect(page.getByRole('heading', { name: '分镜管理', exact: true })).toBeVisible();
  await expect(page.getByText('星耀', { exact: true })).toBeVisible();
  await expect(page.getByText('7 个分镜', { exact: true })).toBeVisible();
  const table = page.getByRole('table');
  await expect(table.getByRole('row')).toHaveCount(8);
  for (const name of ['角色', '场景', '道具', '参考视频', '视频', '操作']) {
    await expect(table.getByRole('columnheader', { name, exact: true })).toBeVisible();
  }
  const firstShot = table.getByRole('row').nth(1);
  await firstShot.getByRole('button', { name: '添加角色', exact: true }).click();
  const assets = page.getByRole('complementary', { name: '素材库' });
  await assets.getByRole('textbox', { name: '搜索素材名称' }).fill('顾言');
  await assets.getByRole('button', { name: '顾言', exact: true }).click();
  await expect(firstShot.getByRole('button', { name: '顾言', exact: true })).toBeVisible();
  const rowHeight = await firstShot.evaluate((row) => row.clientHeight);
  await assets.getByRole('textbox', { name: '搜索素材名称' }).fill('守门人');
  await assets.getByRole('button', { name: '守门人', exact: true }).click();
  const moreRoles = firstShot.getByRole('button', { name: '查看其余 1 个角色' });
  await expect(moreRoles).toBeVisible();
  expect(await firstShot.evaluate((row) => row.clientHeight)).toBe(rowHeight);
  await moreRoles.click();
  await expect(assets.getByRole('textbox', { name: '搜索素材名称' })).toHaveValue('');
  await expect(assets.getByRole('button', { name: '守门人', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await assets.getByRole('textbox', { name: '搜索素材名称' }).fill('顾言');
  const tablePanel = page.getByRole('region', { name: '分镜列表' });
  const expandedWidth = await tablePanel.evaluate((node) => node.clientWidth);
  await page.getByRole('button', { name: '收起素材库' }).click();
  await expect(assets).toBeHidden();
  await expect
    .poll(() => tablePanel.evaluate((node) => node.clientWidth))
    .toBeGreaterThan(expandedWidth);
  const expandAssets = page.getByRole('button', { name: '展开素材库' });
  await expect(expandAssets).toHaveAttribute('aria-expanded', 'false');
  await expandAssets.click();
  await expect(assets.getByRole('textbox', { name: '搜索素材名称' })).toHaveValue('顾言');
  await page.getByRole('button', { name: '收起素材库' }).click();
  await firstShot.getByRole('button', { name: '添加角色', exact: true }).click();
  await expect(assets).toBeVisible();
  await firstShot.getByRole('button', { name: '预览', exact: true }).click();
  await expect(
    page.getByRole('complementary', { name: '视频详情' }).locator('video'),
  ).toBeVisible();
  await page.getByRole('button', { name: '返回素材库' }).click();
  await expect(assets).toBeVisible();

  await expect(page.getByRole('combobox', { name: '章节' })).toHaveCount(0);
  await expect(page).toHaveURL((url) => !url.searchParams.has('chapterId'));
  await page.getByRole('button', { name: '编辑分镜 4', exact: true }).click();
  const editor = page.getByRole('dialog', { name: '编辑分镜 4' });
  const prompt = editor.getByRole('textbox', { name: '描述词' });
  await expect(prompt).toBeFocused();
  await prompt.fill('特写，灯光渐暗。');
  await editor.getByRole('textbox', { name: '备注' }).fill('镜头校对');
  await editor.getByRole('spinbutton', { name: '时长（秒）' }).fill('8');
  await editor.getByRole('combobox', { name: '比例' }).click();
  await page.getByRole('option', { name: '9:16', exact: true }).click();
  await editor.getByRole('combobox', { name: '分辨率' }).click();
  await page.getByRole('option', { name: '1080p', exact: true }).click();
  await editor.getByRole('button', { name: '保存分镜' }).click();
  await expect(editor).toBeHidden();
  const editedRow = table.getByRole('row').filter({ hasText: '特写，灯光渐暗。' });
  await expect(editedRow).toContainText('镜头校对');
  await expect(editedRow).toContainText('8 秒');
  await expect(editedRow).toContainText('9:16 · 1080p');

  await page.reload();
  await expect(editedRow).toBeVisible();
  await page.getByRole('button', { name: '编辑分镜 4', exact: true }).click();
  await prompt.fill('取消后不应保存');
  await page.keyboard.press('Escape');
  await expect(editor).toBeHidden();
  await expect(editedRow).toBeVisible();
  await page.getByRole('button', { name: '行内编辑分镜 4 的描述词' }).click();
  const inline = page.getByRole('textbox', { name: '分镜 4 描述词' });
  await inline.fill('中景，窗外亮起灯光。');
  await inline.press('Enter');
  await expect(table.getByText('中景，窗外亮起灯光。', { exact: true })).toBeVisible();
});

test('a 5,000-shot list virtualizes scrolling and preserves selection and an open edit', async ({
  page,
}) => {
  await openNewProject(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await createStoryboard(page, '大剧目', 5000);
  const table = page.getByRole('table');
  const scroller = page.getByRole('region', { name: '全部分镜' });
  const firstCheckbox = page.getByRole('checkbox', { name: '选择分镜 1', exact: true });
  const lastCheckbox = page.getByRole('checkbox', { name: '选择分镜 5000', exact: true });
  await expect(table).toHaveAttribute('aria-rowcount', '5001');
  await expect(page.getByRole('button', { name: '下一页' })).toHaveCount(0);
  expect(await table.getByRole('row').count()).toBeLessThan(25);
  await page.getByRole('button', { name: '全选', exact: true }).click();
  await expect(page.getByText(/已选 5,000 镜/)).toBeVisible();
  await expect(firstCheckbox).toBeChecked();
  await page.getByRole('button', { name: '行内编辑分镜 1 的描述词' }).click();
  const inline = page.getByRole('textbox', { name: '分镜 1 描述词' });
  await inline.fill('虚拟列表滚动时保留行内编辑内容。');

  await scroller.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  await expect(lastCheckbox).toBeInViewport();
  await expect(lastCheckbox).toBeChecked();
  await expect(inline).toBeFocused();
  await expect(inline).toHaveValue('虚拟列表滚动时保留行内编辑内容。');
  expect(await table.getByRole('row').count()).toBeLessThan(25);
  await scroller.evaluate((element) => {
    element.scrollTop = 0;
  });
  await expect(firstCheckbox).toBeInViewport();
  await inline.press('Enter');
  await expect(table.getByText('虚拟列表滚动时保留行内编辑内容。')).toBeVisible();

  const metrics = await table.evaluate((element) => {
    const header = element.tHead!.getBoundingClientRect().height;
    const firstRow = element.querySelector('[aria-rowindex="2"]')!;
    return {
      height: element.getBoundingClientRect().height,
      expected: header + firstRow.getBoundingClientRect().height * 5000,
    };
  });
  expect(Math.abs(metrics.height - metrics.expected)).toBeLessThan(2);
  await scroller.evaluate((element) => {
    element.scrollTop = element.scrollHeight / 2;
  });
  await expect(page.getByRole('checkbox', { name: '选择分镜 2501', exact: true })).toBeInViewport();
  await scroller.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  await lastCheckbox.uncheck();
  await expect(page.getByText(/已选 4,999 镜/)).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await scroller.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  await expect(lastCheckbox).toBeInViewport();
  expect(await table.getByRole('row').count()).toBeLessThan(25);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});

test('jumping by shot number locates offscreen rows and handles active filters', async ({
  page,
}) => {
  await openNewProject(page);
  await page.setViewportSize({ width: 1100, height: 760 });
  await createStoryboard(page, '跳转测试', 5000);

  const table = page.getByRole('table');
  const scroller = page.getByRole('region', { name: '全部分镜' });
  const jump = page.getByRole('form', { name: '分镜号跳转' });
  const input = jump.getByRole('textbox', { name: '分镜号' });
  const submit = jump.getByRole('button', { name: '跳转', exact: true });
  const shotRow = (id: number) =>
    table.getByRole('row').filter({
      has: page.getByRole('checkbox', { name: '选择分镜 ' + id, exact: true }),
    });

  await scroller.evaluate((node) => {
    node.scrollLeft = node.scrollWidth;
  });
  expect(await scroller.evaluate((node) => node.scrollLeft)).toBeGreaterThan(0);
  await input.fill('2501');
  await input.press('Enter');
  await expect(shotRow(2501)).toBeInViewport();
  await expect(shotRow(2501)).toHaveAttribute('data-active', 'true');
  expect(await scroller.evaluate((node) => node.scrollLeft)).toBe(0);

  await scroller.evaluate((node) => {
    node.scrollTop = 0;
  });
  await expect(shotRow(2501)).toHaveCount(0);
  await submit.click();
  await expect(shotRow(2501)).toBeInViewport();

  const filter = page.getByRole('button', { name: '筛选', exact: true });
  await filter.click();
  const filterDialog = page.getByRole('dialog', { name: '筛选条件' });
  await filterDialog.getByRole('combobox', { name: '状态' }).click();
  await page.getByRole('option', { name: '成功', exact: true }).click();
  await filterDialog.getByRole('button', { name: '筛选', exact: true }).click();

  await input.fill('02503');
  await submit.click();
  await expect(shotRow(2503)).toBeInViewport();
  await expect(filter).toHaveAttribute('aria-pressed', 'true');

  await input.fill('1.5');
  await input.press('Enter');
  await expect(page.getByRole('alert')).toContainText('请输入有效的分镜号');
  await input.fill('5001');
  await submit.click();
  await expect(page.getByRole('alert')).toContainText('分镜号 5001 不存在');
  await expect(shotRow(2503)).toHaveAttribute('data-active', 'true');

  await input.fill('5000');
  await input.press('Enter');
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(filter).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByRole('status').filter({ hasText: '已清除筛选' })).toBeVisible();
  await expect(shotRow(5000)).toBeInViewport();
  await expect(shotRow(5000)).toHaveAttribute('data-active', 'true');
  expect(await table.getByRole('row').count()).toBeLessThan(25);
});

test('legacy chapter drafts flatten into one list and keep ordered edits and deletions', async ({
  page,
}) => {
  await page.addInitScript(() => {
    sessionStorage.setItem('xinghe-demo-auth', '1');
    const key = 'nova:demo-storyboard:legacy';
    if (sessionStorage.getItem(key)) return;
    const fields = {
      prompt: '旧草稿保留内容',
      remark: '',
      durationSeconds: 5,
      ratio: '16:9',
      resolution: '720p',
    };
    sessionStorage.setItem(
      key,
      JSON.stringify({
        id: 'legacy',
        name: '旧剧目',
        fileName: '旧.txt',
        targetShots: 6,
        model: 'fast',
        edits: { 9: fields, 10: { ...fields, prompt: '最后加入的分镜' } },
        chapterShots: { 1: [9, 2], 2: [], custom: [10] },
        extraChapters: [{ id: 'custom', title: '之前新增的章节' }],
        lastShotId: 11,
      }),
    );
  });
  await page.goto('/?page=storyboard-shots&storyboardId=legacy&chapterId=custom');
  await expect(page).toHaveURL('/?page=storyboard-shots&storyboardId=legacy');
  const table = page.getByRole('table');
  await expect(table.getByRole('checkbox').nth(0)).toHaveAccessibleName('选择分镜 9');
  await expect(table.getByRole('checkbox').nth(1)).toHaveAccessibleName('选择分镜 2');
  await expect(table.getByRole('checkbox').nth(2)).toHaveAccessibleName('选择分镜 5');
  await expect(table.getByRole('checkbox').nth(3)).toHaveAccessibleName('选择分镜 6');
  await expect(table.getByRole('checkbox').nth(4)).toHaveAccessibleName('选择分镜 10');
  await expect(table.getByRole('checkbox')).toHaveCount(5);
  await page.getByRole('button', { name: '编辑备注 9', exact: true }).click();
  const note = page.getByRole('dialog', { name: '编辑备注' });
  await note.getByRole('textbox', { name: '备注' }).fill('保留备注');
  await note.getByRole('button', { name: '保存', exact: true }).click();
  await page.reload();
  await expect(table.getByText('保留备注', { exact: false })).toBeVisible();
  const saved = await page.evaluate(() =>
    JSON.parse(sessionStorage.getItem('nova:demo-storyboard:legacy')!),
  );
  expect(saved.shotIds).toEqual([9, 2, 5, 6, 10]);
  expect(saved.chapterShots).toBeUndefined();
  expect(saved.extraChapters).toBeUndefined();
  expect(saved.lastShotId).toBe(11);
});

test('missing drafts guide users to the form', async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('xinghe-demo-auth', '1'));
  await page.goto('/storyboard-shots?storyboardId=missing');
  await expect(page.getByRole('heading', { name: '分镜草稿不可用' })).toBeVisible();
  await expect(page).toHaveURL(
    (url) => url.pathname === '/' && url.searchParams.get('page') === 'storyboard-shots',
  );
  await page.getByRole('button', { name: '返回新建剧目' }).click();
  await expect(page.getByRole('textbox', { name: '剧目名称' })).toBeVisible();
  await expect(page).toHaveURL('/?page=new-project');
});

test('the shot list supports new shots, batch settings and confirmed deletion', async ({
  page,
}) => {
  await openNewProject(page);
  await createStoryboard(page, '列表操作测试', 1);
  await page.getByRole('button', { name: '新建分镜', exact: true }).click();
  const editor = page.getByRole('dialog', { name: '编辑分镜 2' });
  await editor.getByRole('textbox', { name: '描述词' }).fill('走廊的灯逐一熄灭。');
  await editor.getByRole('button', { name: '保存分镜' }).click();
  await page.getByRole('button', { name: '全选', exact: true }).click();
  await page.getByRole('button', { name: '设置', exact: true }).click();
  const settings = page.getByRole('dialog', { name: '批量设置' });
  await settings.getByRole('spinbutton', { name: '时长（秒）' }).fill('12');
  await settings.getByRole('button', { name: '应用' }).click();
  await expect(page.getByRole('table').getByText('12 秒', { exact: true })).toHaveCount(2);
  await page.getByRole('button', { name: '批量删除' }).click();
  await page
    .getByRole('dialog', { name: '删除分镜' })
    .getByRole('button', { name: '删除', exact: true })
    .click();
  await expect(page.getByRole('button', { name: '创建新分镜' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: '创建新分镜' })).toBeVisible();
});

test('storyboard demo connects asset, model, generation and video processing dialogs', async ({
  page,
}) => {
  await openNewProject(page);
  await createStoryboard(page, '制作演示', 4);

  await page.getByRole('button', { name: '创建资产' }).click();
  const create = page.getByRole('dialog', { name: '创建资产' });
  await create.getByRole('textbox', { name: '名称', exact: true }).fill('季风');
  await create.getByRole('textbox', { name: '别名' }).fill('小季');
  await create.getByRole('button', { name: '保存', exact: true }).click();
  await page.getByRole('button', { name: '编辑素材 季风', exact: true }).click();
  const assetEditor = page.getByRole('dialog', { name: '编辑角色' });
  const image = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 4;
    canvas.getContext('2d')?.fillRect(0, 0, 4, 4);
    return canvas.toDataURL('image/png').split(',')[1];
  });
  await assetEditor.getByLabel('素材图片（选填）').setInputFiles({
    name: '季风.png',
    mimeType: 'image/png',
    buffer: Buffer.from(image, 'base64'),
  });
  await expect(assetEditor.getByRole('button', { name: '移除图片' })).toBeVisible();
  await assetEditor.getByRole('button', { name: '预览图片' }).click();
  const imagePreview = page.getByRole('dialog', { name: '素材图片预览' });
  await expect(imagePreview.getByRole('img', { name: '季风' })).toBeVisible();
  await imagePreview.getByRole('button', { name: '关闭', exact: true }).click();
  const audio = Buffer.alloc(44 + 800);
  audio.write('RIFF', 0);
  audio.writeUInt32LE(audio.length - 8, 4);
  audio.write('WAVEfmt ', 8);
  audio.writeUInt32LE(16, 16);
  audio.writeUInt16LE(1, 20);
  audio.writeUInt16LE(1, 22);
  audio.writeUInt32LE(8000, 24);
  audio.writeUInt32LE(16000, 28);
  audio.writeUInt16LE(2, 32);
  audio.writeUInt16LE(16, 34);
  audio.write('data', 36);
  audio.writeUInt32LE(audio.length - 44, 40);
  await assetEditor.getByLabel('角色音频（选填）').setInputFiles({
    name: '音色.wav',
    mimeType: 'audio/wav',
    buffer: audio,
  });
  await expect(assetEditor.locator('audio')).toBeVisible();
  await assetEditor.getByRole('textbox', { name: '备注' }).fill('实景服装');
  await assetEditor.getByRole('button', { name: '保存', exact: true }).click();
  await page.getByRole('button', { name: '图片合规检验' }).click();
  const compliance = page.getByRole('dialog', { name: '图片合规检验' });
  await compliance.getByRole('button', { name: '开始演示检验' }).click();
  await expect(compliance.getByRole('listitem').filter({ hasText: '季风' })).toContainText(
    '图片已就绪',
  );
  await compliance.getByRole('button', { name: '关闭', exact: true }).click();

  await page.getByRole('button', { name: '画风素材', exact: true }).click();
  const style = page.getByRole('dialog', { name: '画风素材' });
  await style.getByRole('button', { name: '国风水墨' }).click();
  await style.getByRole('button', { name: '保存', exact: true }).click();
  await page.getByRole('button', { name: '选择模型 1', exact: true }).click();
  const model = page.getByRole('dialog', { name: '选择模型' });
  await model.getByRole('combobox', { name: '视频模型' }).click();
  await page.getByRole('option', { name: 'Pro', exact: true }).click();
  await model.getByRole('button', { name: '确定', exact: true }).click();
  await expect(page.getByRole('button', { name: '选择模型 1', exact: true })).toHaveText('Pro');
  await page.getByRole('button', { name: '编辑备注 1', exact: true }).click();
  const remark = page.getByRole('dialog', { name: '编辑备注' });
  await remark.getByRole('textbox', { name: '备注' }).fill('导演批注');
  await remark.getByRole('button', { name: '保存', exact: true }).click();
  await expect(page.getByRole('button', { name: '编辑备注 1', exact: true })).toContainText(
    '导演批注',
  );
  await page.getByRole('button', { name: '行内编辑分镜 1 的描述词' }).click();
  const prompt = page.getByRole('textbox', { name: '分镜 1 描述词' });
  await prompt.fill('小季沿河远行。');
  await prompt.press('Enter');

  const secondRow = page
    .getByRole('row')
    .filter({ has: page.getByRole('checkbox', { name: '选择分镜 2', exact: true }) });
  await secondRow.getByRole('button', { name: '添加参考视频', exact: true }).click();
  const addReference = page.getByRole('dialog', { name: '添加参考视频' });
  await addReference.getByRole('button', { name: '添加参考视频', exact: true }).click();
  await secondRow.getByRole('button', { name: '参考片段', exact: true }).click();
  await expect(page.getByRole('complementary', { name: '视频详情' })).toContainText('参考视频');
  await secondRow.getByRole('button', { name: '移除参考视频', exact: true }).click();
  await page
    .getByRole('dialog', { name: '移除参考视频' })
    .getByRole('button', { name: '确认移除' })
    .click();
  await expect(secondRow.getByRole('button', { name: '参考片段', exact: true })).toHaveCount(0);

  const autoMatch = page.getByRole('switch', { name: '自动匹配素材', exact: true });
  await expect(autoMatch).toHaveAccessibleDescription('');
  await expect(autoMatch).not.toBeChecked();
  await autoMatch.click();
  await expect(autoMatch).toBeChecked();
  await page.getByRole('checkbox', { name: '选择分镜 1', exact: true }).check();
  await page.getByRole('checkbox', { name: '选择分镜 2', exact: true }).check();
  await page.getByRole('button', { name: '开始生成' }).click();
  await page
    .getByRole('dialog', { name: '生成分镜视频' })
    .getByRole('button', { name: '确认生成' })
    .click();
  await expect(page.getByText('已生成 2 个演示视频')).toBeVisible();
  const firstRow = page
    .getByRole('row')
    .filter({ has: page.getByRole('checkbox', { name: '选择分镜 1', exact: true }) });
  await expect(firstRow.getByRole('button', { name: '季风', exact: true })).toBeVisible();
  await firstRow.getByRole('button', { name: '生成记录 1', exact: true }).click();
  const records = page.getByRole('dialog', { name: '生成记录' });
  const generated = records.getByRole('listitem').filter({ hasText: '生成视频' });
  await expect(generated).toContainText('Pro');
  await expect(generated).toContainText('东方水墨');
  await generated.getByRole('button', { name: '播放', exact: true }).click();
  const playback = page.getByRole('dialog', { name: '视频播放' });
  await expect(playback.locator('video')).toBeVisible();
  await playback.getByRole('button', { name: '画质增强' }).click();
  const enhance = page.getByRole('dialog', { name: '画质增强' });
  await enhance.getByRole('button', { name: '取消', exact: true }).click();
  await expect(playback).toBeVisible();
  await playback.getByRole('button', { name: '关闭', exact: true }).click();
  await expect(records).toBeVisible();
  await generated.getByRole('button', { name: '播放', exact: true }).click();
  await playback.getByRole('button', { name: '画质增强' }).click();
  await enhance.getByRole('combobox', { name: '目标分辨率' }).click();
  await page.getByRole('option', { name: '4K', exact: true }).click();
  await enhance.getByRole('button', { name: '确认增强' }).click();
  const video = page.getByRole('complementary', { name: '视频详情' });
  await expect(video).toContainText('4k');
  await video.getByRole('button', { name: '大屏播放' }).click();
  await playback.getByRole('button', { name: '擦除字幕' }).click();
  await page
    .getByRole('dialog', { name: '擦除字幕' })
    .getByRole('button', { name: '确认擦除' })
    .click();
  await video.getByRole('button', { name: '视频历史' }).click();
  const history = page.getByRole('dialog', { name: '视频历史' });
  await expect(history.getByRole('listitem')).toHaveCount(4);
  await history
    .getByRole('listitem')
    .filter({ hasText: '生成视频' })
    .getByRole('button', { name: '设为当前' })
    .click();
  await history.getByRole('button', { name: '关闭', exact: true }).click();
  await expect(video).toContainText('720p');

  await page.reload();
  await firstRow.getByRole('button', { name: '预览', exact: true }).click();
  await expect(video).toContainText('720p');
  await video.getByRole('button', { name: '视频历史' }).click();
  await expect(history.getByRole('listitem').filter({ hasText: '擦除字幕' })).toContainText('4k');
});

test('project XLSX export can be imported and invalid workbooks leave the list untouched', async ({
  page,
}) => {
  await openNewProject(page);
  await createStoryboard(page, '表格演示', 1);
  const [template] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: '导出模板(xlsx)', exact: true }).click(),
  ]);
  expect(template.suggestedFilename()).toBe('分镜导入模板.xlsx');
  const [chapterFile] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: '导出分镜', exact: true }).click(),
  ]);
  const workbook = await readFile(await chapterFile.path());
  expect(workbook.subarray(0, 2).toString()).toBe('PK');

  await page.getByRole('button', { name: '导入(xlsx)', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: '导入分镜' });
  const input = dialog.getByLabel('选择 XLSX 文件');
  await input.setInputFiles({
    name: '坏文件.xlsx',
    mimeType: 'application/octet-stream',
    buffer: Buffer.from('not a workbook'),
  });
  await expect(dialog.getByRole('alert')).toContainText('无法读取工作簿');
  await expect(dialog.getByRole('button', { name: '确认导入' })).toBeDisabled();
  await input.setInputFiles({
    name: chapterFile.suggestedFilename(),
    mimeType: 'application/octet-stream',
    buffer: workbook,
  });
  await expect(dialog.getByRole('status')).toContainText('识别到 1 个分镜');
  await dialog.getByRole('button', { name: '确认导入' }).click();
  await expect(page.getByText('已导入 1 个分镜')).toBeVisible();
  await expect(page.getByRole('table').getByRole('row')).toHaveCount(3);
  await page.reload();
  await expect(page.getByRole('table').getByRole('row')).toHaveCount(3);
});
