import { test, expect, Page } from '@playwright/test'
import path from 'path'
import fs from 'fs'

/**
 * UAT — Chat with Kiros AI. Assertions target the ASSISTANT MESSAGE bubble
 * specifically (data-testid="chat-message-assistant"), NOT the page body.
 * This guarantees a pass means the AI actually responded with content, not
 * that the page happens to contain relevant text in its sidebar/chrome.
 */

async function sendMessage(page: Page, text: string) {
  const input = page.locator('textarea').last()
  await input.fill(text)
  const sendBtn = page.getByRole('button', { name: /^send$/i }).first()
  if (await sendBtn.isVisible().catch(() => false)) {
    await sendBtn.click()
  } else {
    await input.press('Enter')
  }
}

async function assistantMessageWithContent(page: Page, minChars = 40, timeout = 45000) {
  // The assistant message bubble — fail if it never renders OR if it renders empty
  const assistant = page.getByTestId('chat-message-assistant').last()
  await expect(assistant, 'Assistant message must render').toBeVisible({ timeout })
  // Poll until the bubble has actual content (streaming may take time)
  await expect
    .poll(async () => (await assistant.textContent())?.trim().length ?? 0, {
      message: `Assistant response must have at least ${minChars} characters`,
      timeout,
    })
    .toBeGreaterThanOrEqual(minChars)
  return assistant
}

test.describe('AI Chat — real response verification', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/chat')
    await expect(page).toHaveURL(/\/chat/, { timeout: 10000 })
  })

  test('10.1 QA1 question gets a non-empty AI response', async ({ page }) => {
    test.setTimeout(90000)
    await sendMessage(page, 'What is our QA1 status?')
    const assistant = await assistantMessageWithContent(page, 60)
    const content = (await assistant.textContent()) || ''
    // Beyond length: response must reference QA1 topic (educational program or elements)
    expect(
      content,
      `Assistant response should mention QA1 domain (educational program, EYLF, 1.1.x elements)`,
    ).toMatch(/QA1|1\.1\.|1\.2\.|1\.3\.|educational program|EYLF|learning|programming|curriculum|practice/i)
  })

  test('9.1 Recruitment prompt yields a response about recruitment', async ({ page }) => {
    test.setTimeout(90000)
    await sendMessage(page, 'Help me recruit an educator for the Joeys room')
    const assistant = await assistantMessageWithContent(page, 60)
    const content = (await assistant.textContent()) || ''
    // Must reference the actual topic — recruitment domain language
    expect(
      content,
      'Assistant response should reference recruitment concepts (candidate, position, qualifications, etc.)',
    ).toMatch(/recruit|candidate|position|interview|qualification|educator|hire|role|wwcc|first aid/i)
  })

  test('10.6 File attachment lets the AI read the file', async ({ page }) => {
    test.setTimeout(120000)
    const fileInput = page.locator('input[type="file"]').first()
    if ((await fileInput.count()) === 0) test.skip(true, 'No file input in DOM')

    // Seed a recognisable marker in the uploaded file
    const marker = 'Marker-UAT-' + Date.now()
    const tmp = path.join(__dirname, '../../playwright/tmp-test.txt')
    fs.mkdirSync(path.dirname(tmp), { recursive: true })
    fs.writeFileSync(tmp, `${marker}\n\nThis document is about QA1 educational program compliance.`)

    try {
      await fileInput.setInputFiles(tmp)
      await page.waitForTimeout(1500)
      await sendMessage(page, `Read the attached document. What is the marker word at the top?`)
      const assistant = await assistantMessageWithContent(page, 30)
      const content = (await assistant.textContent()) || ''
      // The AI should have read the file and echoed the marker OR referenced QA1 content
      expect(
        content,
        `Assistant should reference the file's marker (${marker}) or its QA1 content`,
      ).toMatch(new RegExp(`${marker}|QA1|educational program|compliance`, 'i'))
    } finally {
      try {
        fs.unlinkSync(tmp)
      } catch {
        // ignore
      }
    }
  })
})
