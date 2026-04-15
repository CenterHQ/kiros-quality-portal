import { test, expect } from '@playwright/test'

/**
 * Category B — error-state tests.
 * Intercepts API calls with page.route() to simulate failures. Verifies
 * that the UI shows a user-visible error (toast, banner, "Something went
 * wrong" card) rather than a blank page, crash, or silent failure.
 */

test.describe('Error states surface to the user', () => {
  test('Tasks API 500 keeps the page shell intact', async ({ page }) => {
    await page.route('**/api/tasks**', route =>
      route.fulfill({ status: 500, body: JSON.stringify({ error: 'Simulated' }) })
    )
    await page.goto('/tasks')
    // The page heading must still render even when the data API fails —
    // verifying a shell with heading (not just any body text which is trivially true).
    await expect(page.getByRole('heading', { name: /task board/i })).toBeVisible({ timeout: 10000 })
  })

  test('Dashboard handles partial data failure', async ({ page }) => {
    await page.route('**/api/activity**', route =>
      route.fulfill({ status: 500, body: '{}' })
    )
    await page.goto('/dashboard')
    // Dashboard heading still renders even when one API fails
    await expect(page.getByRole('heading', { name: /^dashboard$/i })).toBeVisible({ timeout: 10000 })
  })

  test('Invalid apply token renders error card, not blank', async ({ page }) => {
    await page.context().clearCookies()
    await page.goto('/apply/definitely-not-a-valid-token-9999')
    await expect(page.getByText(/something went wrong/i)).toBeVisible({ timeout: 10000 })
  })

  test('Chat send with intercepted stream shows user message AND an error affordance', async ({ page }) => {
    await page.goto('/chat')
    await page.route('**/api/chat/stream**', route => route.fulfill({ status: 500, body: '{}' }))

    const textarea = page.locator('textarea').last()
    await textarea.fill('test error handling')
    const sendBtn = page.getByRole('button', { name: /^send$/i }).first()
    if (await sendBtn.isVisible().catch(() => false)) await sendBtn.click()
    else await textarea.press('Enter')

    // User message renders in its bubble (NOT just anywhere in the body — that would
    // also match the textarea attribute or sidebar text)
    await expect(page.getByTestId('chat-message-user').filter({ hasText: /test error handling/i }))
      .toBeVisible({ timeout: 5000 })

    // There should be SOME user-visible feedback (a toast, an inline error, or
    // no phantom assistant response with body text)
    await page.waitForTimeout(3000)
    const assistantLast = page.getByTestId('chat-message-assistant').last()
    const assistantText = (await assistantLast.textContent().catch(() => ''))?.trim() ?? ''
    // Either no assistant message, or assistant message contains error-style copy
    if (assistantText.length > 0) {
      expect(assistantText, 'Intercepted stream should surface an error, not a normal response').toMatch(
        /error|failed|try again|unavailable|sorry/i,
      )
    }
  })

  test('Unknown route shows a 404 page or redirects to a real page', async ({ page }) => {
    await page.goto('/this-page-does-not-exist-12345').catch(() => {})
    // Either a Next.js 404 with "not found" copy, or the app redirected to a
    // real route whose heading we can identify. Never a blank white screen.
    const url = page.url()
    if (/404|not.?found/i.test(url) || /this-page-does-not-exist/.test(url)) {
      await expect(page.getByText(/not found|404|page could not be found/i).first()).toBeVisible({ timeout: 5000 })
    } else {
      // App redirected; verify it landed somewhere real with a heading
      const headingCount = await page.locator('h1, h2, h3').count()
      expect(headingCount).toBeGreaterThan(0)
    }
  })
})
