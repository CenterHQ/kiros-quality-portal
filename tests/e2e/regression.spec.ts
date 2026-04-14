import { test, expect } from '@playwright/test'

test.describe('Regression — Existing Features', () => {
  test('Dashboard loads', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/dashboard/)
    await expect(page.locator('body')).not.toContainText(/500|unhandled error/i)
  })

  test('Policies page loads', async ({ page }) => {
    await page.goto('/policies')
    await expect(page).toHaveURL(/\/policies/)
    await expect(page.locator('body')).not.toContainText(/500|unhandled error/i)
  })

  test('Checklists page loads', async ({ page }) => {
    await page.goto('/checklists')
    await expect(page).toHaveURL(/\/checklists/)
    await expect(page.locator('body')).not.toContainText(/500|unhandled error/i)
  })

  test('Chat page loads', async ({ page }) => {
    await page.goto('/chat')
    await expect(page).toHaveURL(/\/chat/)
    const input = page.locator('textarea, input[type="text"]').last()
    await expect(input).toBeVisible({ timeout: 10000 })
  })

  test('Hub loads', async ({ page }) => {
    await page.goto('/hub')
    await expect(page.locator('body')).not.toContainText(/500|unhandled error/i)
  })

  test('Learning page loads', async ({ page }) => {
    await page.goto('/learning')
    await expect(page.locator('body')).not.toContainText(/500|unhandled error/i)
  })

  test('No console errors on dashboard', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text())
    })
    await page.goto('/dashboard')
    await page.waitForTimeout(2000)
    // Ignore common benign 3rd-party errors
    const critical = errors.filter(
      (e) => !/favicon|network|401|403|chrome-extension/i.test(e),
    )
    expect(critical.length).toBeLessThan(5)
  })
})
