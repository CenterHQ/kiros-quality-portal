import { test, expect } from '@playwright/test'

/**
 * UAT — Remaining admin pages that are config surfaces; each must load and
 * show a recognisable heading or identifying text.
 */

const pages = [
  { path: '/admin/ai-learnings', match: /learning|knowledge/i, name: 'AI Learnings' },
  { path: '/admin/ai-analytics', match: /analytic|token|cost|usage/i, name: 'AI Analytics' },
  { path: '/admin/ai-prompts', match: /prompt/i, name: 'AI Prompts' },
  { path: '/admin/notifications', match: /notification|rule|alert/i, name: 'Notifications' },
  { path: '/admin/tags', match: /tag/i, name: 'Tags' },
  { path: '/admin/sharepoint', match: /sharepoint|sync|folder/i, name: 'SharePoint' },
  { path: '/admin/owna', match: /owna|api/i, name: 'OWNA API' },
]

test.describe('Admin — Misc pages', () => {
  for (const { path, match, name } of pages) {
    test(`${name} page loads`, async ({ page }) => {
      await page.goto(path)
      await expect(page.locator('body').getByText(match).first()).toBeVisible({ timeout: 10000 })
    })
  }
})
