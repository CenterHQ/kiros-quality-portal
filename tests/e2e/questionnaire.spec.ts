import { test, expect } from '@playwright/test'

/**
 * UAT — Standalone Questionnaire (public /apply page)
 * Pure frontend, no auth. Tests visual feedback for invalid tokens and
 * confirms the page does not redirect to /login.
 */
test.describe('Public Apply Page', () => {
  // Force unauthenticated context — simulates a candidate opening an email link
  test.use({ storageState: { cookies: [], origins: [] } })

  test('4.2 No auth required — page loads without redirect', async ({ page }) => {
    await page.goto('/apply/some-token')
    expect(page.url()).not.toContain('/login')
  })

  test('4.17 Invalid token shows user-facing error', async ({ page }) => {
    await page.goto('/apply/invalid-token-xyz-12345')
    // The page renders an error card with "Something went wrong" heading
    await expect(page.getByText(/something went wrong/i)).toBeVisible({ timeout: 10000 })
    expect(page.url()).not.toContain('/login')
  })

  test('4.1 Valid token shows questionnaire (requires seeded candidate)', async ({ page }) => {
    const token = process.env.TEST_CANDIDATE_TOKEN
    test.skip(!token, 'Set TEST_CANDIDATE_TOKEN env var to run this test')

    await page.goto(`/apply/${token}`)
    // Scope to a heading (not body text which would trivially match anywhere)
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 10000 })
    // Progress indicator confirms the questionnaire engine mounted
    await expect(
      page.locator('[role="progressbar"]').first().or(page.locator('[class*="progress"]').first()),
    ).toBeVisible({ timeout: 10000 })
  })
})
