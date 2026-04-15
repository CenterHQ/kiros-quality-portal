import { test, expect } from '@playwright/test'

test.describe('Documents', () => {
  test('N1.1 Documents page loads', async ({ page }) => {
    await page.goto('/documents')
    await expect(page.getByRole('heading', { name: /^documents$/i }).first()).toBeVisible({ timeout: 10000 })
  })

  test('N1.1 Upload File control visible', async ({ page }) => {
    await page.goto('/documents')
    await expect(page.getByRole('button', { name: /upload file/i })).toBeVisible({ timeout: 10000 })
  })

  test('N1.1 QA filter chips visible', async ({ page }) => {
    await page.goto('/documents')
    // Real page shows QA1-QA7 filter chips as buttons
    await expect(page.getByRole('button', { name: /^QA1$/i })).toBeVisible({ timeout: 10000 })
    await expect(page.getByRole('button', { name: /^all$/i })).toBeVisible()
  })

  test('N3.1 AI Documents library loads', async ({ page }) => {
    await page.goto('/documents/library')
    await expect(page.locator('body')).toContainText(/document|library|generated/i, { timeout: 10000 })
  })
})
