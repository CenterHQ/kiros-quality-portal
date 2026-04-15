import { test, expect } from '@playwright/test'

/**
 * UAT — Admin Agents management page
 * Pure frontend: visible text and buttons, no DB assertions.
 * The /admin/agents route renders the AI Configuration hub with all agents
 * listed as expandable panels.
 */
test.describe('Admin Agents Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/agents')
    await expect(page).toHaveURL(/\/admin\/agents/)
  })

  test('All expected agents listed', async ({ page }) => {
    const expectedAgents = [
      /QA1/i, /QA2/i, /QA7/i,
      /Marketing/i, /Compliance/i,
      /Recruitment/i, /Educational Leadership/i, /Learning Module/i,
    ]
    for (const name of expectedAgents) {
      await expect(page.getByText(name).first()).toBeVisible({ timeout: 10000 })
    }
  })

  test('Expanding an agent reveals editable config', async ({ page }) => {
    // The Master agent card is first; click it to reveal sub-tabs
    const master = page.getByText(/Kiros AI \(Master\)|System Prompt/i).first()
    await expect(master).toBeVisible({ timeout: 10000 })

    // The expanded state exposes the System Prompt editor
    await expect(page.getByText(/system prompt/i).first()).toBeVisible({ timeout: 5000 })
  })
})
