import { test, expect } from '@playwright/test'

test.describe('Compliance', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/compliance')
  })

  test('F1.1 Page header visible', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /compliance/i }).first()).toBeVisible({ timeout: 10000 })
  })

  test('F1.1 Compliance items rendered or empty state shown', async ({ page }) => {
    // Either a table/list exists OR there's an empty state message
    await expect(
      page.locator('table').first()
        .or(page.getByText(/no compliance|no items|empty/i).first())
    ).toBeVisible({ timeout: 10000 })
  })
})
