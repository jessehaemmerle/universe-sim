import { expect, test, type Page } from '@playwright/test';

async function open(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('/?test');
  await expect(page.locator('#loading')).toHaveClass(/done/, { timeout: 60_000 });
  return errors;
}

const isPhone = (page: Page) => (page.viewportSize()?.width ?? 1440) < 900;

test('the Earth loads with every deletable thing listed', async ({ page }) => {
  const errors = await open(page);
  await expect(page.locator('#stage canvas')).toBeVisible();
  await expect(page.locator('button.word')).toHaveCount(67);
  await expect(page.locator('#verdict')).toHaveText('Thriving');
  await expect(page.locator('#caption')).toContainText('Pick anything to delete');
  expect(errors).toEqual([]);
});

test('deleting the Moon starts the clock and reports what happens', async ({ page }) => {
  const errors = await open(page);
  const moon = page.locator('button.word[data-id="moon"]');
  await moon.click();
  await expect(moon).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#caption')).toContainText('The Moon vanishes');
  await expect(page.locator('#play')).toHaveAttribute('data-playing', 'true');
  if (isPhone(page)) await page.locator('.tabs button[data-tab="feed"]').click();
  await expect(page.locator('#feed li').first()).toContainText('The Moon vanishes');

  await page.locator('#undo').click();
  await expect(moon).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('#play')).toBeDisabled();
  expect(errors).toEqual([]);
});

test('jumping ahead after deleting gravity shows a destroyed planet', async ({ page }) => {
  await open(page);
  await page.locator('button.word[data-id="gravity"]').click();
  await page.evaluate(() => {
    const g = (window as unknown as { __game: { jump: (s: number) => void; pause: () => void } }).__game;
    g.pause();
    g.jump(86400);
  });
  if (isPhone(page)) await page.locator('.tabs button[data-tab="vitals"]').click();
  await expect(page.locator('#verdict')).toHaveText('Destroyed');
  const widths = await page.locator('.vitals .bar i').evaluateAll((els) => els.map((e) => (e as HTMLElement).style.width));
  expect(widths.every((w) => w === '0%')).toBe(true);
});

test('search narrows the list', async ({ page }) => {
  await open(page);
  await page.locator('#search').fill('bee');
  await expect(page.locator('button.word:visible')).toHaveCount(1);
  await page.locator('#search').fill('zzz');
  await expect(page.locator('.no-results')).toBeVisible();
});

test('the discoveries list opens and closes', async ({ page }) => {
  await open(page);
  await page.locator('#discoveries-btn').click();
  await expect(page.locator('#discoveries')).toBeVisible();
  await expect(page.locator('#disc-list li')).toHaveCount(33);
  await page.locator('#disc-close').click();
  await expect(page.locator('#discoveries')).toBeHidden();
});
