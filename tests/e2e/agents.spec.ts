import { test, expect } from '@playwright/test'

/**
 * UAT — Admin Agents management page
 * Pure frontend: visible text and buttons, no DB assertions.
 */
test.describe('Admin Agents Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/agents')
    await expect(page).toHaveURL(/\/admin\/agents/)
  })

  test('All expected agents listed', async ({ page }) => {
    // User-visible recognition: core QA agents + three new specialist agents
    const expectedAgents = [
      /QA1/i, /QA2/i, /QA7/i,
      /Marketing/i, /Compliance/i,
      /Recruitment/i, /Educational Leadership/i, /Learning Module/i,
    ]
    for (const name of expectedAgents) {
      await expect(page.getByText(name).first()).toBeVisible({ timeout: 10000 })
    }
  })

  test('Edit flow reveals agent details', async ({ page }) => {
    const editBtn = page.getByRole('button', { name: /^edit$/i }).first()
    await expect(editBtn).toBeVisible({ timeout: 10000 })
    await editBtn.click()

    // After clicking Edit, the page shows editable fields — system prompt, tools, etc.
    await expect(page.getByText(/system prompt|tools|model/i).first()).toBeVisible({ timeout: 5000 })
  })

  test('Test Agent control exists', async ({ page }) => {
    await expect(page.getByRole('button', { name: /test agent|test$/i }).first()).toBeVisible({ timeout: 10000 })
  })
})
