import { test, expect } from '@playwright/test'

test.describe('Registers', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/registers')
  })

  test('H1.1 Page loads with heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /registers/i }).first()).toBeVisible({ timeout: 10000 })
  })

  test('H1.1 Room cards or empty state render', async ({ page }) => {
    await expect(
      page.locator('body').getByText(/room|no rooms|no registers/i).first()
    ).toBeVisible({ timeout: 10000 })
  })
})
