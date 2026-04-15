import { test, expect } from '@playwright/test'

test.describe('Activity Log', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/activity')
  })

  test('R1.1 Activity page loads', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /activity/i }).first()).toBeVisible({ timeout: 10000 })
  })

  test('R1.2 Timeline renders or empty state', async ({ page }) => {
    await expect(
      page.locator('body').getByText(/logged in|updated|created|no activity/i).first()
    ).toBeVisible({ timeout: 10000 })
  })
})
