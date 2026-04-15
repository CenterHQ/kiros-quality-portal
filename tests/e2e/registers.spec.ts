import { test, expect } from '@playwright/test'

test.describe('Registers', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/registers')
  })

  test('H1.1 Page heading visible', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /^registers$/i }).first()).toBeVisible({ timeout: 10000 })
  })

  test('H1.1 Register cards visible', async ({ page }) => {
    // Actual registers are custom data registers: Chemical, Device, Key, etc.
    await expect(page.getByText(/chemical register|device register|medication register|visitor register/i).first()).toBeVisible({ timeout: 10000 })
  })

  test('H1.1 New Register button visible', async ({ page }) => {
    await expect(page.getByRole('button', { name: /new register/i })).toBeVisible({ timeout: 10000 })
  })

  test('H1.1 Register actions available', async ({ page }) => {
    // Each register card has Open, Edit, Copy, Archive actions
    await expect(page.getByRole('button', { name: /^open$/i }).first()).toBeVisible({ timeout: 10000 })
  })
})
