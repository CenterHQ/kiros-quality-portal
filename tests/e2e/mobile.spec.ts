import { test, expect } from '@playwright/test'

/**
 * Category C — mobile viewport.
 * Runs core pages at iPhone SE dimensions (375×667) using Chromium only
 * (no WebKit dependency — Chromium-based mobile emulation is sufficient
 * for layout/overflow checks and avoids requiring a separate browser
 * install).
 */

test.use({
  viewport: { width: 375, height: 667 },
  hasTouch: true,
  isMobile: true,
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
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
})
