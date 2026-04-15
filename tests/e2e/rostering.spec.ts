import { test, expect } from '@playwright/test'

test.describe('Rostering', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/rostering')
  })

  test('O1.1 Page loads with heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /roster/i }).first()).toBeVisible({ timeout: 10000 })
  })

  test('O1.3 Roster grid or empty state visible', async ({ page }) => {
    await expect(
      page.locator('table, [role="grid"]').first()
        .or(page.getByText(/no shifts|no roster|no staff scheduled/i).first())
    ).toBeVisible({ timeout: 10000 })
  })
})
