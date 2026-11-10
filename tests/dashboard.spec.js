import { test, expect } from '@playwright/test'
test.beforeEach(async ({ page }) => { await page.goto('./'); await page.evaluate(() => document.fonts.ready) })

test('the catch panel names a case and a note', async ({ page }) => {
  await expect(page.getByTestId('catch')).toBeVisible()
  await expect(page.getByTestId('catch-note')).not.toBeEmpty()
})

test('the header reports the meta-rubric is sound', async ({ page }) => {
  await expect(page.locator('.stats')).toContainText('sound')
  await expect(page.locator('.stats')).toContainText('yes')
})

test('the matrix has one row per case', async ({ page }) => {
  const rows = page.locator('[data-testid="matrix"] tbody tr')
  await expect(rows).toHaveCount(4)
})

test('dashboard screenshot is stable', async ({ page }) => {
  await expect(page.locator('main')).toHaveScreenshot('dashboard.png')
})
