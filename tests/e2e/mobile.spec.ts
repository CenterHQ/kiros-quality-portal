import { test, expect, devices } from '@playwright/test'

/**
 * Category C — mobile viewport.
 * Runs core pages at 375×667 (iPhone SE) and verifies they render without
 * horizontal scroll or broken layout. Particularly critical for /apply
 * which is the candidate-facing public surface.
 */

test.use({
  ...devices['iPhone SE'],
})

const mobilePages = [
  '/dashboard',
  '/tasks',
  '/checklists',
  '/learning',
  '/chat',
  '/candidates',
  '/programming',
  '/documents',
]

test.describe('Mobile viewport — no horizontal scroll', () => {
  for (const path of mobilePages) {
    test(`${path}: viewport scrollable only vertically`, async ({ page }) => {
      await page.goto(path)
      await page.waitForLoadState('networkidle')

      const hasHScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth + 2
      })
      expect(hasHScroll, `${path} should not have horizontal scroll`).toBeFalsy()
    })

    test(`${path}: renders meaningful content`, async ({ page }) => {
      await page.goto(path)
      await page.waitForLoadState('networkidle')
      const bodyText = await page.locator('body').textContent()
      expect(bodyText?.length ?? 0).toBeGreaterThan(100)
    })
  }

  test('Apply page (critical mobile surface) usable at iPhone SE width', async ({ page }) => {
    await page.context().clearCookies()
    await page.goto('/apply/invalid-token-mobile-test')
    const hasHScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth + 2
    })
    expect(hasHScroll).toBeFalsy()
    await expect(page.getByText(/something went wrong/i)).toBeVisible()
  })

  test('Sidebar collapses or hides on mobile', async ({ page }) => {
    await page.goto('/dashboard')
    // On iPhone SE the sidebar should be either hidden or behind a toggle —
    // check that the main content area is at least half the viewport
    const mainWidth = await page.evaluate(() => {
      const main = document.querySelector('main, [role="main"]')
      if (main) return main.getBoundingClientRect().width
      return document.body.getBoundingClientRect().width
    })
    expect(mainWidth).toBeGreaterThan(200)
  })
})
