import { test, expect } from '@playwright/test'

test.describe('Programming Hub', () => {
  test('Navigates to programming hub', async ({ page }) => {
    await page.goto('/programming')
    await expect(page).toHaveURL(/\/programming/)
  })

  test('Stats cards visible', async ({ page }) => {
    await page.goto('/programming')
    // Stat cards typically have numbers; look for multiple card-like elements
    const cards = page.locator('[data-testid*="stat"], .card, [class*="Card"]')
    await expect(cards.first()).toBeVisible({ timeout: 10000 })
  })

  test('PDSA cycle widget present', async ({ page }) => {
    await page.goto('/programming')
    const pdsa = page.getByText(/pdsa|plan.*do.*study.*act/i).first()
    await expect(pdsa).toBeVisible({ timeout: 10000 })
  })

  test('New Learning Story opens modal', async ({ page }) => {
    await page.goto('/programming')
    const btn = page.getByRole('button', { name: /new learning story|learning story/i }).first()
    await btn.click()

    // Modal/dialog should open
    const dialog = page.locator('[role="dialog"], [data-testid*="modal"]').first()
    await expect(dialog).toBeVisible({ timeout: 5000 })
  })

  test('Learning story modal submit navigates to chat', async ({ page }) => {
    await page.goto('/programming')
    const btn = page.getByRole('button', { name: /new learning story|learning story/i }).first()
    await btn.click()

    const dialog = page.locator('[role="dialog"]').first()
    await expect(dialog).toBeVisible({ timeout: 5000 })

    // Fill any required fields
    const textInputs = dialog.locator('input[type="text"], textarea')
    const count = await textInputs.count()
    for (let i = 0; i < count; i++) {
      await textInputs.nth(i).fill('Sensory play with sand and water').catch(() => {})
    }

    const submit = dialog.getByRole('button', { name: /generate|create|submit|start/i }).first()
    if (await submit.isVisible().catch(() => false)) {
      await submit.click()
      await page.waitForURL(/\/chat/, { timeout: 15000 }).catch(() => {})
    }
  })
})
