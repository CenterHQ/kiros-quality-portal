import { test, expect } from '@playwright/test'

test.describe('Documents', () => {
  test('N1.1 Documents page loads', async ({ page }) => {
    await page.goto('/documents')
    await expect(page.getByRole('heading', { name: /documents/i }).first()).toBeVisible({ timeout: 10000 })
  })

  test('N1.2 Search input visible', async ({ page }) => {
    await page.goto('/documents')
    await expect(page.getByPlaceholder(/search/i).first()).toBeVisible({ timeout: 10000 })
  })

  test('N3.1 AI Documents library loads', async ({ page }) => {
    await page.goto('/documents/library')
    await expect(page.locator('body')).toContainText(/document|library|ai/i, { timeout: 10000 })
  })
})
