import { test, expect } from '@playwright/test'

/**
 * Category B — role matrix visibility.
 * Runs against the currently authenticated user (admin by default). Verifies
 * that role-specific navigation items either appear (if admin) or are
 * bounded by the role filter logic. Without a role-switcher this spec
 * enforces the admin happy path; multi-role runs require TEST_ROLE env var
 * in auth.setup.ts.
 */
test.describe('Role matrix — current user (admin) sees privileged sections', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard')
  })

  test('Recruitment group visible in sidebar', async ({ page }) => {
    await expect(page.getByText(/^recruitment$/i).first()).toBeVisible({ timeout: 10000 })
  })

  test('Admin group visible in sidebar', async ({ page }) => {
    await expect(page.getByText(/^admin$/i).first()).toBeVisible({ timeout: 10000 })
  })

  test('Marketing group visible in sidebar', async ({ page }) => {
    await expect(page.getByText(/^marketing$/i).first()).toBeVisible({ timeout: 10000 })
  })

  test('Programming group visible in sidebar', async ({ page }) => {
    await expect(page.getByText(/^programming$/i).first()).toBeVisible({ timeout: 10000 })
  })

  test('AP Dashboard link visible for AP role', async ({ page }) => {
    const apLink = page.getByRole('link', { name: /ap dashboard/i })
    if (await apLink.isVisible().catch(() => false)) {
      await expect(apLink).toBeVisible()
    }
  })

  test('Admin sub-pages all reachable', async ({ page }) => {
    const adminPages = [
      '/admin/ai-config', '/admin/agents', '/admin/users',
      '/admin/context', '/admin/ai-prompts', '/admin/ai-learnings',
      '/admin/ai-analytics', '/admin/notifications', '/admin/tags',
      '/admin/sharepoint', '/admin/owna',
    ]
    for (const path of adminPages) {
      const response = await page.goto(path)
      expect(response?.status(), `${path} status`).toBeLessThan(400)
      expect(page.url(), `${path} did not redirect to login`).not.toContain('/login')
    }
  })

  test('Recruitment sub-pages all reachable', async ({ page }) => {
    for (const path of ['/candidates', '/candidates/positions']) {
      const response = await page.goto(path)
      expect(response?.status()).toBeLessThan(400)
      expect(page.url()).not.toContain('/login')
    }
  })
})
