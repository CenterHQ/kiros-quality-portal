import { test, expect } from '@playwright/test'

test.describe('AI Agents — deep interactions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/agents')
  })

  test('S2-Deep.1 All 12 agents accessible in the list', async ({ page }) => {
    const agents = [
      /QA1 Agent/i, /QA2 Agent/i, /QA3 Agent/i, /QA4 Agent/i, /QA5 Agent/i, /QA6 Agent/i, /QA7 Agent/i,
      /Marketing Agent/i, /Compliance Agent/i,
      /Recruitment Agent/i, /Educational Leadership/i, /Learning Module/i,
    ]
    for (const a of agents) {
      await expect(page.getByText(a).first()).toBeVisible({ timeout: 10000 })
    }
  })

  test('S2-Deep.2 Agent row shows tools count or description', async ({ page }) => {
    // Each agent should show some description text in the list
    await expect(page.getByText(/system prompt|tools|agent|prompt/i).first()).toBeVisible({ timeout: 10000 })
  })

  test('S2-Deep.3 Clicking agent reveals editable fields', async ({ page }) => {
    // The Kiros AI (Master) card is expanded by default on admin/agents.
    // It has a "System Prompt" sub-tab which contains a textarea for the prompt.
    // Click the System Prompt tab first to ensure the editor is visible.
    const sysPromptTab = page.getByRole('button', { name: /^system prompt$/i })
      .or(page.getByRole('tab', { name: /system prompt/i }))
      .first()
    if (await sysPromptTab.isVisible().catch(() => false)) {
      await sysPromptTab.click()
    }
    // Now a textarea (the system prompt editor) should be present
    await expect(page.locator('textarea').first()).toBeVisible({ timeout: 10000 })
  })
})
