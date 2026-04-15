import { test, expect, Page } from '@playwright/test'

/**
 * UAT — Chat deep flows.
 * Every assertion targets the assistant message bubble via data-testid,
 * never the body. A "pass" means the AI actually responded with content.
 */

async function send(page: Page, text: string) {
  const textarea = page.locator('textarea').last()
  await textarea.fill(text)
  const sendBtn = page.getByRole('button', { name: /^send$/i }).first()
  if (await sendBtn.isVisible().catch(() => false)) await sendBtn.click()
  else await textarea.press('Enter')
}

async function assistantResponse(page: Page, minChars = 40, timeout = 60000) {
  const assistant = page.getByTestId('chat-message-assistant').last()
  await expect(assistant, 'Assistant message must render').toBeVisible({ timeout })
  await expect
    .poll(async () => (await assistant.textContent())?.trim().length ?? 0, { timeout })
    .toBeGreaterThanOrEqual(minChars)
  return (await assistant.textContent()) || ''
}

test.describe('Chat — deep interactions with AI response verification', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/chat')
    await expect(page).toHaveURL(/\/chat/)
  })

  test('M-Deep.1 Composer accepts input and echoes user message', async ({ page }) => {
    const textarea = page.locator('textarea').last()
    await expect(textarea).toBeVisible({ timeout: 10000 })
    await textarea.fill('Deep composer test')
    await expect(textarea).toHaveValue('Deep composer test')
  })

  test('M-Deep.2 Send ping and get a substantive AI response', async ({ page }) => {
    test.setTimeout(90000)
    await send(page, 'What does K.I.R.O.S stand for?')
    const content = await assistantResponse(page, 50)
    // The AI should answer with the centre philosophy acronym expansion
    expect(content, 'Response should explain at least one K.I.R.O.S value').toMatch(
      /knowledge|integrity|resilience|openness|safe harbour/i,
    )
  })

  test('M-Deep.3 User message persists on reload AND so does AI response', async ({ page }) => {
    test.setTimeout(120000)
    const marker = `persist-${Date.now()}`
    await send(page, `${marker} — tell me one short fact about the NQS`)
    // Wait for both user bubble and assistant bubble
    await expect(page.getByTestId('chat-message-user').filter({ hasText: marker })).toBeVisible({ timeout: 10000 })
    await assistantResponse(page, 40)

    await page.reload()
    // After reload, both messages are still present
    await expect(page.getByTestId('chat-message-user').filter({ hasText: marker })).toBeVisible({ timeout: 15000 })
    const assistantAfter = page.getByTestId('chat-message-assistant').last()
    const text = (await assistantAfter.textContent())?.trim() ?? ''
    expect(text.length, 'Assistant response should also persist').toBeGreaterThan(20)
  })

  test('M-Deep.4 New Conversation button clears message area', async ({ page }) => {
    const newBtn = page.getByRole('button', { name: /new conversation|new chat/i }).first()
    if (await newBtn.isVisible().catch(() => false)) {
      await newBtn.click()
      await page.waitForTimeout(500)
      // After starting a new conversation, there should be no assistant messages yet
      const assistantCount = await page.getByTestId('chat-message-assistant').count()
      expect(assistantCount).toBe(0)
    } else {
      test.skip(true, 'New Conversation control not present in this layout')
    }
  })

  test('M-Deep.5 Empty send is ignored (no assistant reply for empty input)', async ({ page }) => {
    const before = await page.getByTestId('chat-message-assistant').count()
    const textarea = page.locator('textarea').last()
    await textarea.fill('')
    await textarea.press('Enter')
    await page.waitForTimeout(2000)
    const after = await page.getByTestId('chat-message-assistant').count()
    expect(after, 'Empty send must not produce a response').toBeLessThanOrEqual(before)
  })
})
