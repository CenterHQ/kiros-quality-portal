import { test, expect } from '@playwright/test'

test.describe('Help & Resources', () => {
  test('V1.1 Guide page loads', async ({ page }) => {
    await page.goto('/guide')
    await expect(page.getByRole('heading', { name: /guide|help/i }).first()).toBeVisible({ timeout: 10000 })
  })

  test('V2.1 Resources page loads', async ({ page }) => {
    await page.goto('/resources')
    await expect(page.getByRole('heading', { name: /resource/i }).first()).toBeVisible({ timeout: 10000 })
  })
})
