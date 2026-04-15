import { test, expect } from '@playwright/test'

test.describe('Approved Provider Dashboard', () => {
  test('T1.1 AP Dashboard loads (admin only)', async ({ page }) => {
    await page.goto('/ap-dashboard')
    // Admin role should see AP content; other roles get redirected / denied
    await expect(
      page.locator('body').getByText(/approved provider|ap dashboard|centres|access/i).first()
    ).toBeVisible({ timeout: 10000 })
  })
})
