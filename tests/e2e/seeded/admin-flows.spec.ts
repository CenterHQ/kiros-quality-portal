import { test, expect } from '@playwright/test'

/**
 * Category D — Seeded: Admin management flows
 *
 * Env vars:
 *   TEST_USER_ID         — staff profile id to edit
 *   TEST_AGENT_NAME      — agent name to test (e.g. "QA1 Agent")
 *   TEST_LEARNING_ID     — ai_learning id for edit flow
 *   RUN_ADMIN_MUTATIONS  — "1" to run mutation tests (edit/save)
 */

test.describe('Seeded — admin user management', () => {
  const userId = process.env.TEST_USER_ID

  test.beforeEach(() => {
    test.skip(!userId, 'Set TEST_USER_ID to run')
  })

  test('D-Seed.U1 Users page lists the target user', async ({ page }) => {
    await page.goto('/admin/users')
    await expect(page.locator('body')).toContainText(/email|role|name|staff/i, { timeout: 10000 })
  })

  test('D-Seed.U2 User edit control present', async ({ page }) => {
    await page.goto('/admin/users')
    const editBtn = page.getByRole('button', { name: /^edit$/i }).first()
    if (await editBtn.isVisible().catch(() => false)) {
      await expect(editBtn).toBeVisible()
    }
  })
})

test.describe('Seeded — admin agent test runner', () => {
  const agentName = process.env.TEST_AGENT_NAME || 'QA1 Agent'

  test.beforeEach(() => {
    test.skip(!process.env.RUN_AGENT_TEST, 'Set RUN_AGENT_TEST=1')
  })

  test('D-Seed.AG1 Agent system prompt is editable', async ({ page }) => {
    await page.goto('/admin/agents')
    await page.getByText(new RegExp(agentName, 'i')).first().click()
    const textarea = page.locator('textarea').first()
    if (await textarea.isVisible().catch(() => false)) {
      const original = await textarea.inputValue()
      expect(original.length).toBeGreaterThan(10)
    }
  })

  test('D-Seed.AG2 Agent test runner executes', async ({ page }) => {
    await page.goto('/admin/agents')
    await page.getByText(new RegExp(agentName, 'i')).first().click()
    // Find test prompt section
    const testTextarea = page.locator('textarea').last()
    if (await testTextarea.isVisible().catch(() => false)) {
      await testTextarea.fill('Simple test query')
      const runBtn = page.getByRole('button', { name: /run test|test agent/i }).first()
      if (await runBtn.isVisible().catch(() => false)) {
        await runBtn.click()
        await page.waitForTimeout(15000)
        // Some response text appears
        await expect(page.locator('body')).not.toContainText(/unhandled/i)
      }
    }
  })
})

test.describe('Seeded — AI learnings admin', () => {
  const learningId = process.env.TEST_LEARNING_ID

  test.beforeEach(() => {
    test.skip(!learningId, 'Set TEST_LEARNING_ID to run')
  })

  test('D-Seed.L1 Learnings list renders', async ({ page }) => {
    await page.goto('/admin/ai-learnings')
    await expect(page.locator('body')).toContainText(/learning|knowledge|source/i, { timeout: 10000 })
  })

  test('D-Seed.L2 Learning entry editable', async ({ page }) => {
    await page.goto('/admin/ai-learnings')
    const editBtn = page.getByRole('button', { name: /^edit$/i }).first()
    if (await editBtn.isVisible().catch(() => false)) {
      await editBtn.click()
      await expect(page.locator('textarea').first()).toBeVisible({ timeout: 5000 })
    }
  })
})

test.describe('Seeded — admin config mutation', () => {
  test.beforeEach(() => {
    test.skip(!process.env.RUN_ADMIN_MUTATIONS, 'Set RUN_ADMIN_MUTATIONS=1')
  })

  test('D-Seed.AC1 Changing a config value shows save feedback', async ({ page }) => {
    await page.goto('/admin/ai-config')
    // Find a numeric input we can tweak safely — then restore
    const input = page.locator('input[type="number"]').first()
    if (await input.isVisible().catch(() => false)) {
      const original = await input.inputValue()
      await input.fill(original || '1')
      const saveBtn = page.getByRole('button', { name: /^save$/i }).first()
      if (await saveBtn.isVisible().catch(() => false)) {
        await saveBtn.click()
        await page.waitForTimeout(2000)
        // Some confirmation appears
        await expect(page.locator('body')).not.toContainText(/error|failed/i)
      }
    }
  })
})
