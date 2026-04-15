import { test, expect, Page } from '@playwright/test'

/**
 * Category D — Seeded: AI Chat tool use and agent delegation.
 * Assertions target the assistant message bubble, NOT the body. This
 * prevents sidebar words (Recruitment/Programming/Candidates/etc.) from
 * making tests pass when the AI returned nothing.
 */

async function send(page: Page, text: string) {
  const textarea = page.locator('textarea').last()
  await textarea.fill(text)
  const sendBtn = page.getByRole('button', { name: /^send$/i }).first()
  if (await sendBtn.isVisible().catch(() => false)) await sendBtn.click()
  else await textarea.press('Enter')
}

async function assistantContent(page: Page, minChars = 50, timeout = 90000) {
  const assistant = page.getByTestId('chat-message-assistant').last()
  await expect(assistant, 'Assistant must render a response bubble').toBeVisible({ timeout })
  await expect
    .poll(async () => (await assistant.textContent())?.trim().length ?? 0, { timeout })
    .toBeGreaterThanOrEqual(minChars)
  return (await assistant.textContent()) || ''
}

test.describe('Seeded — chat tool use and agent delegation', () => {
  test.beforeEach(({ page }) => {
    test.skip(!process.env.RUN_CHAT_TOOLS, 'Set RUN_CHAT_TOOLS=1 to run')
  })

  test('D-Seed.CH1 QA1 query gets a QA1-relevant response', async ({ page }) => {
    test.setTimeout(120000)
    await page.goto('/chat')
    await send(page, 'What is our QA1 compliance status? Include specific element numbers.')
    const text = await assistantContent(page, 80)
    expect(text, 'Response should cite QA1 elements 1.1.x / 1.2.x / 1.3.x').toMatch(
      /1\.[123]\.[0-9]|QA1|educational program|EYLF|learning framework/i,
    )
  })

  test('D-Seed.CH2 Recruitment delegation produces recruitment content', async ({ page }) => {
    test.setTimeout(120000)
    await page.goto('/chat')
    await send(page, 'Help me recruit an educator for the Joeys room — suggest interview questions')
    const text = await assistantContent(page, 100)
    // Must contain actual recruitment-domain content, not just the word "recruitment"
    expect(text).toMatch(/interview|question|candidate|qualification|wwcc|first aid|experience|childcare/i)
    // And cannot be just a sidebar-chrome echo — must be substantial
    expect(text.length).toBeGreaterThan(150)
  })

  test('D-Seed.CH3 EL agent generates programming content', async ({ page }) => {
    test.setTimeout(120000)
    await page.goto('/chat')
    await send(page, 'Generate a weekly program plan for the toddlers room aligned with EYLF')
    const text = await assistantContent(page, 100)
    expect(text).toMatch(/belonging|being|becoming|learning outcome|intentional|PDSA|observation|reflection/i)
    expect(text.length).toBeGreaterThan(200)
  })

  test('D-Seed.CH4 Learning Module agent designs a module', async ({ page }) => {
    test.setTimeout(120000)
    await page.goto('/chat')
    await send(page, 'Create a training module on positive behaviour guidance for Cert III educators')
    const text = await assistantContent(page, 100)
    expect(text).toMatch(/section|content|quiz|reflection|objective|learning outcome/i)
    expect(text.length).toBeGreaterThan(200)
  })

  test('D-Seed.CH5 File attachment round-trip — AI references file content', async ({ page }) => {
    test.setTimeout(120000)
    await page.goto('/chat')
    const fileInput = page.locator('input[type="file"]').first()
    if ((await fileInput.count()) === 0) test.skip(true, 'No file input visible')

    const marker = 'FILE-MARKER-' + Date.now()
    await fileInput.setInputFiles({
      name: 'uat-test.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from(`${marker}\n\nReg 73 mandates an approved learning framework in NQS QA1.`),
    })
    await page.waitForTimeout(2000)
    await send(page, `Read the attached document. What marker does it start with, and what regulation does it cite?`)
    const text = await assistantContent(page, 40)
    // AI must reference either the marker OR the regulation from the file
    expect(text, 'AI must reference file content, not return generic text').toMatch(
      new RegExp(`${marker}|Reg 73|QA1|learning framework`, 'i'),
    )
  })
})

test.describe('Seeded — chat conversation resumption', () => {
  const conv = process.env.TEST_EXISTING_CONVERSATION_ID

  test.beforeEach(() => {
    test.skip(!conv, 'Set TEST_EXISTING_CONVERSATION_ID to run')
  })

  test('D-Seed.CH6 Loading a prior conversation shows multiple messages', async ({ page }) => {
    await page.goto(`/chat?conversation=${conv}`)
    await page.waitForLoadState('networkidle')
    // Should have at least one user message and one assistant message rendered
    const userCount = await page.getByTestId('chat-message-user').count()
    const assistantCount = await page.getByTestId('chat-message-assistant').count()
    expect(userCount, 'Prior conversation should have user messages').toBeGreaterThan(0)
    expect(assistantCount, 'Prior conversation should have assistant messages').toBeGreaterThan(0)
  })
})
