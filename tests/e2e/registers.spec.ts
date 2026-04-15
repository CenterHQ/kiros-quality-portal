import { test, expect } from '@playwright/test'

test.describe('Registers', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/registers')
  })

  test('H1.1 Page heading visible', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /^registers$/i }).first()).toBeVisible({ timeout: 10000 })
  })

  test('H1.1 Register cards visible', async ({ page }) => {
    await expect(page.getByText(/chemical register|device register|medication register|visitor register/i).first()).toBeVisible({ timeout: 10000 })
  })

  test('H1.1 New Register button visible', async ({ page }) => {
    await expect(page.getByRole('button', { name: /new register/i })).toBeVisible({ timeout: 10000 })
  })

  test('H1.1 Template badge visible on register cards', async ({ page }) => {
    // Each register card has a "Template" badge visible
    await expect(page.getByText(/^Template$/).first()).toBeVisible({ timeout: 10000 })
  })
})
