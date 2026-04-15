import { test, expect } from '@playwright/test'

/**
 * Category B — empty-state tests.
 * Verifies that when a page has data or no data, the UI renders
 * intelligibly (list OR empty placeholder). Asserts on structural text
 * (page heading, tabs, stats) rather than empty-state-specific copy so
 * the test works in both data states.
 */

const checks = [
  { path: '/checklists', match: /operational checklists|today|upcoming|history|tickets/i },
  { path: '/candidates', match: /recruitment|all|invited|positions|new position|invite candidate/i },
  { path: '/tasks', match: /task board|board|list|add task|to do|in progress/i },
  { path: '/documents', match: /^documents$|upload file|no documents found/i },
  { path: '/learning', match: /learning|completed|in progress|overdue|total hours/i },
  { path: '/activity', match: /activity|logged|updated|created|no activity/i },
  { path: '/rostering', match: /rostering|weekly roster|compliance|publish week|add rooms/i },
  { path: '/marketing/inbox', match: /inbox|message|conversation|no messages/i },
  { path: '/marketing/comments', match: /comment/i },
]

test.describe('Empty states render gracefully', () => {
  for (const { path, match } of checks) {
    test(`${path} has recognisable UI (populated or empty)`, async ({ page }) => {
      await page.goto(path)
      await page.waitForLoadState('networkidle')
      await expect(page.locator('body').getByText(match).first()).toBeVisible({ timeout: 10000 })
    })
  }
})
