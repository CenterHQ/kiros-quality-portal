import { test, expect } from '@playwright/test'

test.describe('Checklists', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/checklists')
  })

  test('E1.1 Four status tabs visible', async ({ page }) => {
    const tabs = [/today/i, /upcoming/i, /history/i, /tickets/i]
    for (const t of tabs) {
      await expect(page.getByText(t).first()).toBeVisible({ timeout: 10000 })
    }
  })

  test('E1.3 New checklist trigger present', async ({ page }) => {
    const btn = page.getByRole('button', { name: /new checklist|create checklist|add checklist/i }).first()
    await expect(btn).toBeVisible({ timeout: 10000 })
  })

  test('E1.5 Category filter available', async ({ page }) => {
    const filter = page.locator('select').first()
    await expect(filter).toBeVisible({ timeout: 10000 })
  })
})
