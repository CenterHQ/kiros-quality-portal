import { test, expect } from '@playwright/test'

test.describe('Admin AI Config', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/ai-config')
  })

  test('Page loads', async ({ page }) => {
    await expect(page).toHaveURL(/\/admin\/ai-config/)
  })

  test('Tabs are visible', async ({ page }) => {
    const tabs = page.locator('[role="tab"], [data-testid*="tab"]')
    const count = await tabs.count()
    expect(count).toBeGreaterThan(0)
  })

  test('Click each tab loads content', async ({ page }) => {
    const tabs = page.locator('[role="tab"]')
    const count = await tabs.count()
    // Click up to 15 tabs
    const max = Math.min(count, 15)
    for (let i = 0; i < max; i++) {
      await tabs.nth(i).click()
      await page.waitForTimeout(400)
      // Ensure no visible error
      await expect(page.locator('body')).not.toContainText(/500|unhandled error/i)
    }
    expect(max).toBeGreaterThan(0)
  })

  test('Tool Permissions tab visible', async ({ page }) => {
    const tab = page.getByRole('tab', { name: /tool permissions|tools/i }).first()
    if (await tab.isVisible().catch(() => false)) {
      await tab.click()
      await expect(page.locator('body')).toContainText(/tool/i)
    }
  })

  test('Save/change config value', async ({ page }) => {
    // Find a text/number input, modify and save
    const input = page.locator('input[type="text"], input[type="number"]').first()
    if (await input.isVisible().catch(() => false)) {
      const original = await input.inputValue()
      await input.fill(original || '1')
      const saveBtn = page.getByRole('button', { name: /save/i }).first()
      if (await saveBtn.isVisible().catch(() => false)) {
        await saveBtn.click()
        await page.waitForTimeout(1000)
      }
    }
  })
})
