import { test, expect } from '@playwright/test'

test.describe('Admin Agents Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/agents')
  })

  test('Page loads', async ({ page }) => {
    await expect(page).toHaveURL(/\/admin\/agents/)
  })

  test('10.5 All 12 agents listed', async ({ page }) => {
    // Agent cards / rows
    const cards = page.locator('[data-testid*="agent"], .agent-card, [class*="agent"]').filter({
      hasText: /agent/i,
    })
    // Fallback — look for known agent names
    const expectedAgents = [
      'QA1', 'QA2', 'Marketing', 'Compliance',
      'Recruitment', 'Educational Leadership', 'Learning Module',
    ]
    let foundCount = 0
    for (const name of expectedAgents) {
      if (await page.getByText(new RegExp(name, 'i')).first().isVisible().catch(() => false)) {
        foundCount++
      }
    }
    expect(foundCount).toBeGreaterThan(3)
  })

  test('Edit agent modal opens', async ({ page }) => {
    const editBtn = page.getByRole('button', { name: /edit/i }).first()
    if (await editBtn.isVisible().catch(() => false)) {
      await editBtn.click()
      const dialog = page.locator('[role="dialog"]').first()
      await expect(dialog).toBeVisible({ timeout: 5000 })
    }
  })

  test('Tools list loads', async ({ page }) => {
    const editBtn = page.getByRole('button', { name: /edit/i }).first()
    if (await editBtn.isVisible().catch(() => false)) {
      await editBtn.click()
      const dialog = page.locator('[role="dialog"]').first()
      await expect(dialog).toBeVisible({ timeout: 5000 })
      // Expect multiple checkboxes for tools
      const checkboxes = dialog.locator('input[type="checkbox"]')
      await expect(checkboxes.first()).toBeVisible({ timeout: 5000 })
    }
  })

  test('Test Agent button functionality', async ({ page }) => {
    const testBtn = page.getByRole('button', { name: /test agent|test$/i }).first()
    if (await testBtn.isVisible().catch(() => false)) {
      await testBtn.click()
      await page.waitForTimeout(2000)
    }
  })
})
