import { test, expect } from '@playwright/test'

test.describe('Admin — Users', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/users')
  })

  test('S3.1 Users page loads', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /user/i }).first()).toBeVisible({ timeout: 10000 })
  })

  test('S3.1 User list or empty state shown', async ({ page }) => {
    await expect(
      page.locator('table, [role="table"]').first()
        .or(page.getByText(/no users|empty/i).first())
    ).toBeVisible({ timeout: 10000 })
  })
})
