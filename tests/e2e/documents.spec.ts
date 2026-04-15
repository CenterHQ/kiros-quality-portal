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
    await expect(page.getByRole('button', { name: /^QA1$/i })).toBeVisible({ timeout: 10000 })
    await expect(page.getByRole('button', { name: /^all$/i })).toBeVisible()
  })

  test('N3.1 AI Documents library loads with heading', async ({ page }) => {
    await page.goto('/documents/library')
    // Must have a heading — body text would match "Documents" / "Module Library" in sidebar
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 10000 })
  })
})
