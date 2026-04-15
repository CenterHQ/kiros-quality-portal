import { test, expect } from '@playwright/test'

/**
 * UAT — Admin AI Config page
 * Pure frontend: verify the actual visible tab names and that switching tabs
 * changes content. Tab list (from live UI): Model & Thinking, Chat,
 * Agent Defaults, Uploads, Learning, Brand, Document Styling, Tool
 * Permissions, Display, ...
 */
test.describe('Admin AI Config', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/ai-config')
    await expect(page).toHaveURL(/\/admin\/ai-config/)
  })

  test('Primary tab names visible', async ({ page }) => {
    // Assert a handful of the real, visible tab labels
    const expected = [/model & thinking/i, /chat/i, /tool permissions/i, /brand/i]
    for (const rx of expected) {
      await expect(page.getByText(rx).first()).toBeVisible({ timeout: 10000 })
    }
  })

  test('Clicking Tool Permissions tab shows tool list', async ({ page }) => {
    // The description text also contains "tool permissions"; scope to the tab <button>
    await page.getByRole('button', { name: /^tool permissions$/i }).click()
    // After switching tabs, at least one known tool name should be visible
    await expect(page.getByText(/search_centre_context|get_qa_progress|generate_document/i).first())
      .toBeVisible({ timeout: 10000 })
  })
})
