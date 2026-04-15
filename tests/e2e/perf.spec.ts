import { test, expect } from '@playwright/test'

/**
 * Category C — performance budgets.
 * Lightweight UAT timing thresholds (not a full Lighthouse run). Verifies
 * that core pages reach interactive within reasonable time on Vercel.
 */

const budgets = [
  { path: '/dashboard', nameMs: 8000 },
  { path: '/tasks', nameMs: 8000 },
  { path: '/chat', nameMs: 10000 },
  { path: '/candidates', nameMs: 8000 },
  { path: '/learning', nameMs: 10000 },
  { path: '/programming', nameMs: 8000 },
]

test.describe('Performance — domcontentloaded budgets', () => {
  for (const { path, nameMs } of budgets) {
    test(`${path} reaches DOM interactive under ${nameMs}ms`, async ({ page }) => {
      const start = Date.now()
      await page.goto(path, { waitUntil: 'domcontentloaded' })
      const elapsed = Date.now() - start
      expect(elapsed, `${path} took ${elapsed}ms`).toBeLessThan(nameMs)
    })
  }

  test('Smoke: navigation timing API reports reasonable values', async ({ page }) => {
    await page.goto('/dashboard')
    const timing = await page.evaluate(() => {
      const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      return {
        domContentLoaded: nav.domContentLoadedEventEnd - nav.startTime,
        loadComplete: nav.loadEventEnd - nav.startTime,
      }
    })
    expect(timing.domContentLoaded).toBeLessThan(15000)
    expect(timing.loadComplete).toBeLessThan(30000)
  })
})
