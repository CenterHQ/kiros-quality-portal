import { test, expect } from '@playwright/test'

test.describe('Admin — Centre Context', () => {
  test('S4.1 Context page loads', async ({ page }) => {
    await page.goto('/admin/context')
    await expect(page.getByRole('heading', { name: /context|centre/i }).first()).toBeVisible({ timeout: 10000 })
  })

  test('S4.1 Context sections visible', async ({ page }) => {
    await page.goto('/admin/context')
    await expect(
      page.locator('body').getByText(/QIP|philosophy|teaching|polic/i).first()
    ).toBeVisible({ timeout: 10000 })
  })
})
