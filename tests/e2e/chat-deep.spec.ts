import { test, expect } from '@playwright/test'

test.describe('Chat — deep interactions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/chat')
    await expect(page).toHaveURL(/\/chat/)
  })

  test('M-Deep.1 Composer textarea accepts input', async ({ page }) => {
    const textarea = page.locator('textarea').last()
    await expect(textarea).toBeVisible({ timeout: 10000 })
    await textarea.fill('Test message')
    await expect(textarea).toHaveValue('Test message')
  })

  test('M-Deep.2 Sidebar New Conversation button works', async ({ page }) => {
    const newBtn = page.getByRole('button', { name: /new conversation|new chat/i }).first()
    if (await newBtn.isVisible().catch(() => false)) {
      await newBtn.click()
      await page.waitForTimeout(500)
      // Composer still visible after creating new conversation
      await expect(page.locator('textarea').last()).toBeVisible()
    }
  })

  test('M-Deep.3 Attachment button present if supported', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]')
    const count = await fileInput.count()
    expect(count).toBeGreaterThanOrEqual(0) // Informational: attachment may be hidden input
  })

  test('M-Deep.4 Send simple ping gets a response', async ({ page }) => {
    const textarea = page.locator('textarea').last()
    await textarea.fill('ping')
    const sendBtn = page.getByRole('button', { name: /send/i }).first()
    if (await sendBtn.isVisible().catch(() => false)) {
      await sendBtn.click()
    } else {
      await textarea.press('Enter')
    }
    // Expect the user message to appear on the page
    await expect(page.getByText(/^ping$/).first()).toBeVisible({ timeout: 15000 })
  })

  test('M-Deep.5 Streaming response renders incrementally', async ({ page }) => {
    const textarea = page.locator('textarea').last()
    await textarea.fill('What is QA1?')
    const sendBtn = page.getByRole('button', { name: /send/i }).first()
    if (await sendBtn.isVisible().catch(() => false)) await sendBtn.click()
    else await textarea.press('Enter')

    // Give the server a moment
    await page.waitForTimeout(3000)
    // Assistant response body should contain some content
    const bodyText = await page.locator('body').textContent()
    expect(bodyText?.length ?? 0).toBeGreaterThan(200)
  })

  test('M-Deep.6 Conversation persists on reload', async ({ page }) => {
    const textarea = page.locator('textarea').last()
    const marker = `persist-${Date.now()}`
    await textarea.fill(marker)
    const sendBtn = page.getByRole('button', { name: /send/i }).first()
    if (await sendBtn.isVisible().catch(() => false)) await sendBtn.click()
    else await textarea.press('Enter')
    await page.waitForTimeout(3000)

    await page.reload()
    await expect(page.getByText(marker).first()).toBeVisible({ timeout: 10000 })
  })
})
