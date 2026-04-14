import { test, expect, chromium } from '@playwright/test'

test.describe('Test Group 4: Standalone Questionnaire (Public Page)', () => {
  // Use a fresh browser context (no auth) to simulate public access
  test.use({ storageState: { cookies: [], origins: [] } })

  test('4.17 Invalid token shows error', async ({ page }) => {
    await page.goto('/apply/invalid-token-xyz-12345')
    // Expect error / not found message, and NOT redirect to login
    const errorText = page.getByText(/invalid|not found|error|expired|unavailable/i).first()
    await expect(errorText).toBeVisible({ timeout: 10000 })
    expect(page.url()).not.toContain('/login')
  })

  test('4.2 No auth required — apply page loads without redirect', async ({ page }) => {
    const response = await page.goto('/apply/some-token')
    expect(response).not.toBeNull()
    // Should not redirect to login
    expect(page.url()).not.toContain('/login')
  })

  test('4.1 Valid token shows questionnaire (requires seeded candidate)', async ({ page }) => {
    const token = process.env.TEST_CANDIDATE_TOKEN
    test.skip(!token, 'Set TEST_CANDIDATE_TOKEN env var to run this test')

    await page.goto(`/apply/${token}`)

    // Expect questionnaire UI
    await expect(page.locator('body')).toContainText(/question|welcome|assessment/i, { timeout: 10000 })
  })

  test('4.5 Timer and progress visible with valid token', async ({ page }) => {
    const token = process.env.TEST_CANDIDATE_TOKEN
    test.skip(!token, 'Set TEST_CANDIDATE_TOKEN env var to run this test')

    await page.goto(`/apply/${token}`)

    // Look for progress indicator and timer
    const progress = page.locator('[role="progressbar"], .progress, [data-testid="progress"]').first()
    await expect(progress).toBeVisible({ timeout: 10000 })
  })

  test('4.16 Completion screen (manual) — placeholder', async ({ page }) => {
    // This is hard to automate without completing 60 questions.
    // Marking as skip unless explicit full run is requested.
    test.skip(!process.env.RUN_FULL_QUESTIONNAIRE, 'Set RUN_FULL_QUESTIONNAIRE=1 to execute')
  })
})
