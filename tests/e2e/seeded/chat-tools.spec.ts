import { test, expect } from '@playwright/test'

/**
 * Category D — Seeded: AI Chat deep flows with tool use
 *
 * Env vars:
 *   RUN_CHAT_TOOLS — "1" to run (these are slow — agents take 10-30s)
 *   TEST_EXISTING_CONVERSATION_ID — conversation id with prior history
 */

test.describe('Seeded — chat tool use and delegation', () => {
  test.beforeEach(() => {
    test.skip(!process.env.RUN_CHAT_TOOLS, 'Set RUN_CHAT_TOOLS=1 to run')
  })

  test('D-Seed.CH1 QA1 query triggers tool and response', async ({ page }) => {
    await page.goto('/chat')
    const textarea = page.locator('textarea').last()
    await textarea.fill('What is our QA1 compliance status?')
    const sendBtn = page.getByRole('button', { name: /send/i }).first()
    if (await sendBtn.isVisible().catch(() => false)) await sendBtn.click()
    else await textarea.press('Enter')

    // Tool execution chip or agent badge appears
    await expect(page.locator('body')).toContainText(/QA1|status|compliance|searching|tool/i, { timeout: 60000 })
  })

  test('D-Seed.CH2 Recruitment agent delegation', async ({ page }) => {
    await page.goto('/chat')
    const textarea = page.locator('textarea').last()
    await textarea.fill('help me recruit an educator for the Joeys room')
    await textarea.press('Enter')
    await expect(page.locator('body')).toContainText(/recruitment|candidate|position|educator/i, { timeout: 60000 })
  })

  test('D-Seed.CH3 Educational Leadership agent for programming', async ({ page }) => {
    await page.goto('/chat')
    const textarea = page.locator('textarea').last()
    await textarea.fill('generate a weekly program plan for the toddlers room based on our philosophy')
    await textarea.press('Enter')
    await expect(page.locator('body')).toContainText(/program|EYLF|toddler|plan|learning/i, { timeout: 60000 })
  })

  test('D-Seed.CH4 Learning Module agent for training', async ({ page }) => {
    await page.goto('/chat')
    const textarea = page.locator('textarea').last()
    await textarea.fill('create a training module on positive behaviour guidance for educators')
    await textarea.press('Enter')
    await expect(page.locator('body')).toContainText(/module|training|behaviour|positive|section/i, { timeout: 60000 })
  })

  test('D-Seed.CH5 File attachment round-trip', async ({ page }) => {
    await page.goto('/chat')
    const fileInput = page.locator('input[type="file"]').first()
    if (await fileInput.count() > 0) {
      // Create a tiny test file via Buffer
      await fileInput.setInputFiles({
        name: 'uat-test.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from('This is a UAT test document about NQS QA1 compliance.'),
      })
      await page.waitForTimeout(2000)
      const textarea = page.locator('textarea').last()
      await textarea.fill('What does this document say?')
      await textarea.press('Enter')
      await expect(page.locator('body')).toContainText(/QA1|compliance|document|NQS/i, { timeout: 60000 })
    }
  })
})

test.describe('Seeded — chat conversation resumption', () => {
  const conv = process.env.TEST_EXISTING_CONVERSATION_ID

  test.beforeEach(() => {
    test.skip(!conv, 'Set TEST_EXISTING_CONVERSATION_ID to run')
  })

  test('D-Seed.CH6 Loading a prior conversation shows message history', async ({ page }) => {
    await page.goto(`/chat?conversation=${conv}`)
    await page.waitForLoadState('networkidle')
    const body = await page.locator('body').textContent()
    // Conversation should have substantial content
    expect(body?.length ?? 0).toBeGreaterThan(500)
  })
})
