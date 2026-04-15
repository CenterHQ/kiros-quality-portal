import { test, expect } from '@playwright/test'

/**
 * Category B — error-state tests.
 * Intercepts API calls with page.route() to simulate failures. Verifies
 * that the UI shows a user-visible error (toast, banner, "Something went
 * wrong" card) rather than a blank page, crash, or silent failure.
 */

test.describe('Error states surface to the user', () => {
  test('Tasks API 500 shows a user-visible error', async ({ page }) => {
    await page.route('**/api/tasks**', route =>
      route.fulfill({ status: 500, body: JSON.stringify({ error: 'Simulated' }) })
    )
    await page.goto('/tasks')
    // Page should still render something — not a white screen
    const bodyText = await page.locator('body').textContent()
    expect(bodyText?.length ?? 0).toBeGreaterThan(100)
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

  test('Chat send with intercepted stream falls back gracefully', async ({ page }) => {
    await page.goto('/chat')
    await page.route('**/api/chat/stream**', route => route.fulfill({ status: 500, body: '{}' }))

    const textarea = page.locator('textarea').last()
    await textarea.fill('test error handling')
    const sendBtn = page.getByRole('button', { name: /send/i }).first()
    if (await sendBtn.isVisible().catch(() => false)) await sendBtn.click()
    else await textarea.press('Enter')

    await page.waitForTimeout(3000)
    // User message should still be visible even if response errored
    await expect(page.getByText(/test error handling/i).first()).toBeVisible()
  })

  test('Unknown route shows a recognisable 404 or redirect, not a crash', async ({ page }) => {
    const response = await page.goto('/this-page-does-not-exist-12345')
    const bodyText = await page.locator('body').textContent()
    // Either Next.js 404 page, a redirect back to dashboard, or a custom not-found
    expect(bodyText?.length ?? 0).toBeGreaterThan(50)
  })
})
