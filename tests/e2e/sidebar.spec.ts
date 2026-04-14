import { test, expect, Page } from '@playwright/test'

/**
 * UAT — Sidebar navigation
 * The sidebar groups (Recruitment, Programming, etc.) start collapsed. The
 * group header must be clicked to reveal nested links — that is also what a
 * real user would do.
 */

async function expandGroup(page: Page, name: RegExp) {
  // Group labels are in a <button> with the uppercase group name
  const header = page.locator('button', { hasText: name }).first()
  if (await header.isVisible().catch(() => false)) {
    await header.click()
  }
}

test.describe('Sidebar & Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard')
    // Wait for sidebar to render
    await expect(page.locator('aside, nav').first()).toBeVisible()
  })

  test('1.1 Recruitment group header visible', async ({ page }) => {
    await expect(page.getByText(/^recruitment$/i).first()).toBeVisible({ timeout: 10000 })
  })

  test('1.2 Candidates link visible after expanding Recruitment', async ({ page }) => {
    await expandGroup(page, /recruitment/i)
    await expect(page.getByRole('link', { name: /candidates/i }).first()).toBeVisible()
  })

  test('1.3 Positions link visible after expanding Recruitment', async ({ page }) => {
    await expandGroup(page, /recruitment/i)
    await expect(page.getByRole('link', { name: /positions/i }).first()).toBeVisible()
  })

  test('1.4 Programming group header visible', async ({ page }) => {
    await expect(page.getByText(/^programming$/i).first()).toBeVisible({ timeout: 10000 })
  })

  test('1.5 AI Config accessible via URL', async ({ page }) => {
    await page.goto('/admin/ai-config')
    await expect(page).toHaveURL(/\/admin\/ai-config/)
  })

  test('1.6 Navigating to Candidates works', async ({ page }) => {
    await expandGroup(page, /recruitment/i)
    await page.getByRole('link', { name: /candidates/i }).first().click()
    await page.waitForURL(/\/candidates/, { timeout: 10000 })
    await expect(page).toHaveURL(/\/candidates/)
  })
})
