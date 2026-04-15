import { test, expect } from '@playwright/test'

test.describe('Policies', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/policies')
  })

  test('G1.1 Library page loads', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /polic/i }).first()).toBeVisible({ timeout: 10000 })
  })

  test('G1.1 Tabs present (Library / Review / Acknowledgements)', async ({ page }) => {
    // At least one of the tab labels visible
    await expect(
      page.getByText(/library|review schedule|acknowledgements/i).first()
    ).toBeVisible({ timeout: 10000 })
  })

  test('G1.2 Search input present', async ({ page }) => {
    const search = page.getByPlaceholder(/search/i).first()
    await expect(search).toBeVisible({ timeout: 10000 })
  })
})
