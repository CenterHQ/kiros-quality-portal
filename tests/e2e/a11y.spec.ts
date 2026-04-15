import { test, expect } from '@playwright/test'

/**
 * Category C — accessibility.
 * Uses direct DOM introspection instead of the accessibility.snapshot API
 * (which is flaky across Playwright versions). Verifies that core pages
 * have proper document structure for screen-reader users.
 */

const pages = [
  { path: '/dashboard', name: 'Dashboard' },
  { path: '/tasks', name: 'Tasks' },
  { path: '/chat', name: 'Chat' },
  { path: '/candidates', name: 'Candidates' },
  { path: '/learning', name: 'Learning' },
  { path: '/programming', name: 'Programming' },
  { path: '/admin/ai-config', name: 'Admin AI Config' },
]

test.describe('Accessibility — baseline document structure', () => {
  for (const { path, name } of pages) {
    test(`${name}: document has title`, async ({ page }) => {
      await page.goto(path)
      await page.waitForLoadState('networkidle')
      const title = await page.title()
      expect(title.length, `${path} document title`).toBeGreaterThan(0)
    })

    test(`${name}: at least one heading present`, async ({ page }) => {
      await page.goto(path)
      await page.waitForLoadState('networkidle')
      const headingCount = await page.locator('h1, h2, h3, [role="heading"]').count()
      expect(headingCount, `${path} heading count`).toBeGreaterThan(0)
    })

    test(`${name}: no empty aria-label attributes`, async ({ page }) => {
      await page.goto(path)
      await page.waitForLoadState('networkidle')
      const emptyAria = await page.locator('[aria-label=""]').count()
      expect(emptyAria, `${path} empty aria-label count`).toBe(0)
    })
  }

  test('Login page form fields are reachable', async ({ page }) => {
    await page.context().clearCookies()
    await page.goto('/login')
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
  })

  test('Apply page error state is announced readably', async ({ page }) => {
    await page.context().clearCookies()
    await page.goto('/apply/invalid-token-a11y-test')
    // Error state must be announced via a heading
    await expect(page.getByText(/something went wrong/i)).toBeVisible()
    const headingCount = await page.locator('h1, h2, h3').count()
    expect(headingCount).toBeGreaterThan(0)
  })

  test('All buttons have accessible text', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    // No button should be entirely empty (no text, no aria-label, no title)
    const badButtons = await page.locator('button:not([aria-label]):not([title]):empty').count()
    expect(badButtons).toBe(0)
  })
})
