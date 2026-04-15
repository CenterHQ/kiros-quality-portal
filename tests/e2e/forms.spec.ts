import { test, expect } from '@playwright/test'

test.describe('Forms', () => {
  test('W1.1 Forms page loads', async ({ page }) => {
    await page.goto('/forms')
    await expect(page.getByRole('heading', { name: /form/i }).first()).toBeVisible({ timeout: 10000 })
  })
})
