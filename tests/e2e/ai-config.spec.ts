import { test, expect } from '@playwright/test'

/**
 * UAT — Admin AI Config page
 * Pure frontend: verify the tab navigation is present and switches content.
 */
test.describe('Admin AI Config', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/ai-config')
    await expect(page).toHaveURL(/\/admin\/ai-config/)
  })

  test('Primary tab names are visible', async ({ page }) => {
    // Admin config has tabs like Master Prompt, Model Routing, Tool Permissions, etc.
    // Assert a handful of the well-known ones by visible text.
    const expected = [/master prompt|prompt/i, /model/i, /tool/i]
    for (const rx of expected) {
      await expect(page.getByText(rx).first()).toBeVisible({ timeout: 10000 })
    }
  })

  test('Clicking Tool Permissions tab shows tool list', async ({ page }) => {
    const tab = page.getByRole('button', { name: /tool permissions|tools/i })
      .or(page.getByRole('tab', { name: /tool permissions|tools/i }))
      .first()

    if (await tab.isVisible().catch(() => false)) {
      await tab.click()
      // User should see at least one tool name they recognise
      await expect(page.getByText(/search_centre_context|get_qa_progress|generate_document/i).first())
        .toBeVisible({ timeout: 5000 })
    }
  })
})
