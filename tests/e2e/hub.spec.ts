import { test, expect } from '@playwright/test'

test.describe('Centre Hub', () => {
  test('U1.1 Hub page loads', async ({ page }) => {
    await page.goto('/hub')
    await expect(page).toHaveURL(/\/hub/)
    await expect(page.locator('body')).toContainText(/hub|welcome|centre/i, { timeout: 10000 })
  })
})
