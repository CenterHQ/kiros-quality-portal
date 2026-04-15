import { test, expect } from '@playwright/test'

test.describe('Reports', () => {
  test('R2.1 Reports page loads', async ({ page }) => {
    await page.goto('/reports')
    await expect(page.getByRole('heading', { name: /reports/i }).first()).toBeVisible({ timeout: 10000 })
  })

  test('R3.1 Data Extract page loads', async ({ page }) => {
    await page.goto('/reports/extract')
    await expect(page.locator('body')).toContainText(/extract|data|download/i, { timeout: 10000 })
  })
})
