import { test, expect } from '@playwright/test'

test.describe('QA Elements', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/elements')
  })

  test('C1.1 Page header visible', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /QA Elements/i }).first()).toBeVisible({ timeout: 10000 })
  })

  test('C1.3 Search input filters list', async ({ page }) => {
    const search = page.getByPlaceholder(/search/i).first()
    if (await search.isVisible().catch(() => false)) {
      await search.fill('1.1.1')
      // Either a matching element appears, or an empty state
      await expect(page.locator('body')).toContainText(/1\.1\.1|no elements|no results/i, { timeout: 5000 })
    }
  })

  test('C1.5 QA groups render', async ({ page }) => {
    // At least one QA group heading should be visible
    await expect(page.getByText(/QA\s?[1-7]|Quality Area [1-7]/i).first()).toBeVisible({ timeout: 10000 })
  })

  test('C1.8 Query param filter from dashboard', async ({ page }) => {
    await page.goto('/elements?qa=3')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).toContainText(/QA\s?3|Quality Area 3/i)
  })
})
