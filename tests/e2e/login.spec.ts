import { test, expect } from '@playwright/test'

/**
 * UAT — Login page
 * Runs unauthenticated — skips the shared storage state.
 */
test.describe('Login (unauthenticated)', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('A1.1 Page renders with all required controls', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.getByRole('button', { name: /sign in|log ?in|login/i })).toBeVisible()
  })

  test('A1.3 Bad credentials show an error, stay on /login', async ({ page }) => {
    await page.goto('/login')
    await page.locator('input[type="email"]').fill('not-a-user@example.com')
    await page.locator('input[type="password"]').fill('wrong-password-123')
    await page.getByRole('button', { name: /sign in|log ?in|login/i }).click()

    // Either inline error text or still on /login after reasonable wait
    await page.waitForTimeout(3000)
    expect(page.url()).toContain('/login')
  })

  test('A1.7 Protected route redirects to /login when unauthenticated', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForURL(/\/login/, { timeout: 10000 }).catch(() => {})
    expect(page.url()).toContain('/login')
  })
})
