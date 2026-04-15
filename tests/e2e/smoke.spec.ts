import { test, expect } from '@playwright/test'

/**
 * UAT — Smoke test
 * Fail-fast gate: every top-level route loads, responds under 10s, no console errors.
 */

const CORE_ROUTES = [
  '/dashboard',
  '/elements',
  '/tasks',
  '/checklists',
  '/compliance',
  '/policies',
  '/documents',
  '/documents/library',
  '/registers',
  '/forms',
  '/activity',
  '/reports',
  '/resources',
  '/guide',
  '/learning',
  '/learning/library',
  '/learning/pathways',
  '/learning/pdp',
  '/learning/matrix',
  '/learning/certificates',
  '/candidates',
  '/candidates/positions',
  '/programming',
  '/chat',
  '/hub',
  '/marketing',
  '/owna/staff',
  '/owna/attendance',
  '/owna/children',
  '/owna/families',
  '/owna/enrolments',
  '/owna/health',
  '/admin/ai-config',
  '/admin/agents',
  '/admin/users',
  '/admin/context',
  '/admin/ai-prompts',
  '/admin/ai-learnings',
  '/admin/ai-analytics',
  '/admin/notifications',
  '/admin/tags',
  '/admin/sharepoint',
  '/admin/owna',
]

test.describe('Smoke — every core route loads', () => {
  for (const route of CORE_ROUTES) {
    test(`${route} loads without error`, async ({ page }) => {
      const consoleErrors: string[] = []
      page.on('console', msg => {
        if (msg.type() === 'error') consoleErrors.push(msg.text())
      })

      const response = await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 15000 })
      expect(response?.status(), `${route} HTTP status`).toBeLessThan(400)

      // Basic render check — body must contain content
      const bodyText = await page.locator('body').textContent()
      expect(bodyText?.length ?? 0, `${route} body content`).toBeGreaterThan(50)

      // URL should land on the requested route (or a redirect ancestor, not /login)
      expect(page.url(), `${route} did not redirect to login`).not.toContain('/login')

      // Filter out known noisy / non-fatal errors (third-party scripts, sourcemaps)
      const fatal = consoleErrors.filter(e =>
        !e.includes('sourcemap') &&
        !e.includes('favicon') &&
        !e.includes('/_next/static') &&
        !/ResizeObserver/.test(e)
      )
      expect(fatal, `${route} console errors: ${fatal.join(' | ')}`).toHaveLength(0)
    })
  }
})
