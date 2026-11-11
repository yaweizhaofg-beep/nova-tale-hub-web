import { expect, test } from '@playwright/test';

test.use({ timezoneId: 'America/Los_Angeles' });

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    sessionStorage.setItem('xinghe-demo-auth', '1');
    const route = new URLSearchParams(location.search).get('page');
    sessionStorage.setItem('xinghe-space', route === 'team' ? 'team' : 'personal');
  });
});

test('applying a date range preserves other filters, browser history and the billing link', async ({
  page,
}) => {
  const query = new URLSearchParams({
    page: 'my-tasks',
    dfrom: '2026-08-21',
    dto: '2026-08-21',
    source: 'billing',
    cat: '图片生成',
  });
  await page.goto('/?' + query.toString());
  const trigger = page.getByRole('button', { name: /时间筛选/ });
  await expect(trigger).toContainText('08-21 至 08-21');
  await trigger.click();
  const calendar = page.getByRole('dialog', { name: '选择日期范围' });
  const day = (number: number) =>
    calendar.getByRole('button', { name: '2026年8月' + number + '日' });
  const apply = calendar.getByRole('button', { name: '应用' });
  const dates = calendar.getByRole('group', { name: '当前日期范围' });

  await day(20).click();
  await expect(apply).toBeDisabled();
  await expect(dates).toContainText('2026-08-20');
  await expect(dates).toContainText('待选择');
  await expect(dates).not.toContainText('2026-08-21');
  await day(22).click();
  await expect(apply).toBeEnabled();

  await day(25).click();
  await expect(apply).toBeDisabled();
  await expect(dates).toContainText('2026-08-25');
  await expect(dates).not.toContainText('2026-08-22');
  await day(20).click();
  await expect(apply).toBeEnabled();
  await expect(page).toHaveURL(/dfrom=2026-08-21&dto=2026-08-21/);
  await calendar.getByRole('button', { name: '应用' }).click();
  await expect(trigger).toContainText('08-20 至 08-25');
  await expect(page).toHaveURL(/dfrom=2026-08-20.*dto=2026-08-25.*source=billing/);
  await expect(page.getByRole('button', { name: '返回账单' })).toBeVisible();
  await expect(page.getByRole('combobox', { name: '任务类型' })).toHaveAttribute(
    'data-value',
    '图片生成',
  );
  await expect(trigger).toBeFocused();
  await page.goBack();
  await expect(trigger).toContainText('08-21 至 08-21');

  await trigger.click();
  await calendar.getByRole('button', { name: '清空' }).click();
  await calendar.getByRole('button', { name: '应用' }).click();
  await expect(trigger).toContainText('全部时间');
  await expect(page).toHaveURL(
    (url) =>
      url.searchParams.get('dfrom') === '' &&
      url.searchParams.get('dto') === '' &&
      url.searchParams.get('source') === 'billing',
  );
});

test('keyboard browsing respects the date limit and Escape discards the draft on mobile', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 760 });
  await page.goto('/?page=my-tasks&dfrom=2026-10-04&dto=2026-11-05');
  const trigger = page.getByRole('button', { name: /时间筛选/ });
  await trigger.focus();
  await page.keyboard.press('Enter');
  const calendar = page.getByRole('dialog', { name: '选择日期范围' });
  await expect(calendar.getByRole('button', { name: '2026年10月4日' })).toBeFocused();
  await page.keyboard.press('PageDown');
  await expect(calendar.getByRole('button', { name: '2026年11月4日' })).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(calendar.getByRole('button', { name: '2026年11月5日' })).toBeFocused();
  await expect(calendar.getByRole('button', { name: '2026年11月6日' })).toBeDisabled();
  await page.keyboard.press('Enter');
  await expect(calendar.getByRole('group', { name: '当前日期范围' })).toContainText('2026-11-05');
  await expect(calendar.getByRole('button', { name: '应用' })).toBeDisabled();
  const bounds = await calendar.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(375);

  await page.keyboard.press('Escape');
  await expect(calendar).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await expect(trigger).toContainText('10-04 至 11-05');
  await expect(page).toHaveURL(/dfrom=2026-10-04&dto=2026-11-05/);
});

test('one-sided URL dates stay intact until a new range is applied and same-day ranges work', async ({
  page,
}) => {
  await page.goto('/?page=my-tasks&dfrom=&dto=2026-08-21');
  const trigger = page.getByRole('button', { name: /时间筛选/ });
  await expect(trigger).toContainText('不限 至 08-21');
  await trigger.click();
  const calendar = page.getByRole('dialog', { name: '选择日期范围' });
  const apply = calendar.getByRole('button', { name: '应用' });
  await expect(apply).toBeEnabled();
  await apply.click();
  await expect(page).toHaveURL(/dfrom=&dto=2026-08-21/);

  await trigger.click();
  const day = calendar.getByRole('button', { name: '2026年8月21日' });
  await day.click();
  await expect(apply).toBeDisabled();
  await day.click();
  await apply.click();
  await expect(trigger).toContainText('08-21 至 08-21');
  await expect(page).toHaveURL(/dfrom=2026-08-21&dto=2026-08-21/);
});

test('team usage can restore the seven-day default from the picker', async ({ page }) => {
  await page.goto('/?page=team&tab=usage&dfrom=2026-08-21&dto=2026-08-25');
  const trigger = page.getByRole('button', { name: /时间筛选/ });
  await expect(trigger).toContainText('08-21 至 08-25');
  await trigger.click();
  const calendar = page.getByRole('dialog', { name: '选择日期范围' });
  await calendar.getByRole('button', { name: '恢复默认' }).click();
  await expect(calendar.getByRole('grid', { name: '2026年10月日历' })).toBeVisible();
  await expect(calendar.getByRole('group', { name: '当前日期范围' })).toContainText('2026-10-30');
  await expect(page).toHaveURL(/dfrom=2026-08-21&dto=2026-08-25/);
  await calendar.getByRole('button', { name: '应用' }).click();
  await expect(trigger).toContainText('10-30 至 11-05');
  await expect(page).toHaveURL(
    (url) => !url.searchParams.has('dfrom') && !url.searchParams.has('dto'),
  );
});
