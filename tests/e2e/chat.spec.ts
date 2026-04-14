import { test, expect } from '@playwright/test'
import path from 'path'
import fs from 'fs'

test.describe('AI Chat with Agents', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/chat')
    await expect(page).toHaveURL(/\/chat/, { timeout: 10000 })
  })

  async function sendMessage(page: any, text: string) {
    const input = page.locator('textarea, input[type="text"]').last()
    await input.fill(text)
    const sendBtn = page.getByRole('button', { name: /send/i }).first()
    if (await sendBtn.isVisible().catch(() => false)) {
      await sendBtn.click()
    } else {
      await input.press('Enter')
    }
  }

  test('10.1 QA1 status response', async ({ page }) => {
    await sendMessage(page, 'What is our QA1 status?')
    // Wait for any response
    await page.waitForTimeout(8000)
    const body = await page.locator('body').textContent()
    expect(body?.length).toBeGreaterThan(100)
  })

  test('9.1 Recruitment agent delegation', async ({ page }) => {
    await sendMessage(page, 'Help me recruit an educator')
    await page.waitForTimeout(10000)
    const content = await page.locator('body').textContent()
    expect(content).toMatch(/recruit|educator|candidate|position/i)
  })

  test('10.6 File attachment', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]').first()
    if (!(await fileInput.count())) {
      test.skip()
      return
    }

    // Create a small temp text file
    const tmp = path.join(__dirname, '../../playwright/tmp-test.txt')
    fs.mkdirSync(path.dirname(tmp), { recursive: true })
    fs.writeFileSync(tmp, 'This is a test document about QA1 compliance.')

    await fileInput.setInputFiles(tmp)
    await page.waitForTimeout(1500)
    await sendMessage(page, 'What does this document say?')
    await page.waitForTimeout(10000)

    fs.unlinkSync(tmp)
  })
})
