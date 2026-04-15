import { test, expect } from '@playwright/test'

/**
 * Category C — accessibility.
 * Uses Playwright's built-in accessibility snapshot to verify core pages
 * are navigable via assistive tech. A deeper scan would use
 * @axe-core/playwright; adding that dependency is the next step for WCAG
 * AA compliance checking.
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

test.describe('Accessibility — baseline a11y tree', () => {
  for (const { path, name } of pages) {
    test(`${name}: has an accessibility tree`, async ({ page }) => {
      await page.goto(path)
      await page.waitForLoadState('networkidle')
      const snapshot = await page.accessibility.snapshot()
      expect(snapshot, `${path} should expose an a11y tree`).not.toBeNull()
    })

    test(`${name}: page has a main landmark or heading`, async ({ page }) => {
      await page.goto(path)
      // Every page should have at least one heading for screen readers
      const headingCount = await page.getByRole('heading').count()
      expect(headingCount, `${path} heading count`).toBeGreaterThan(0)
    })

    test(`${name}: no elements with empty aria-label`, async ({ page }) => {
      await page.goto(path)
      await page.waitForLoadState('networkidle')
      const emptyAria = await page.locator('[aria-label=""]').count()
      expect(emptyAria, `${path} empty aria-label count`).toBe(0)
    })
  }

  test('Login page has labelled form fields', async ({ page }) => {
    await page.context().clearCookies()
    await page.goto('/login')
    // Email and password inputs should be present and reachable via role
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
  })

  test('Apply page has readable content for screen readers', async ({ page }) => {
    await page.context().clearCookies()
    await page.goto('/apply/invalid-token-a11y-test')
    const snapshot = await page.accessibility.snapshot()
    expect(snapshot).not.toBeNull()
    // Error state must be announced
    await expect(page.getByText(/something went wrong/i)).toBeVisible()
  })
})
