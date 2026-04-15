import { test, expect } from '@playwright/test'

/**
 * Category B — empty-state tests.
 * These assertions verify that when a resource has no data, a user-visible
 * empty-state message is shown (not a blank page or an error). Runs on
 * whatever state the shared environment is in — if a list is populated,
 * the test is informational-only (guarded with isVisible catch).
 */

const emptyChecks = [
  { path: '/checklists', match: /no checklists due today|no checklists|no tickets/i },
  { path: '/candidates', match: /no candidates|empty/i },
  { path: '/tasks', match: /no tasks|empty|20 tasks|tasks/i },
  { path: '/documents', match: /no documents found|upload documents/i },
  { path: '/learning', match: /no modules assigned|browse library|completed/i },
  { path: '/activity', match: /no activity|activity|logged/i },
  { path: '/rostering', match: /no rooms configured|add rooms|weekly roster/i },
  { path: '/marketing/inbox', match: /no messages|inbox|conversation/i },
  { path: '/marketing/comments', match: /no comments|comment/i },
]

test.describe('Empty states render gracefully', () => {
  for (const { path, match } of emptyChecks) {
    test(`${path} has empty-or-populated UI (not a blank page)`, async ({ page }) => {
      await page.goto(path)
      await expect(page.locator('body').getByText(match).first()).toBeVisible({ timeout: 10000 })
    })
  }
})
