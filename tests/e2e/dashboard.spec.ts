import { test, expect } from '@playwright/test'

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/dashboard/)
  })

  test('B1.1 Page header visible', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /dashboard/i }).first()).toBeVisible({ timeout: 10000 })
  })

  test('B1.3 Stat cards render', async ({ page }) => {
    // Four numeric stats — at minimum one numeric value visible on the dashboard
    const numericMatches = page.locator('body').getByText(/^\d+$/).first()
    await expect(numericMatches).toBeVisible({ timeout: 10000 })
  })

  test('B1.4 QIP Goals section visible', async ({ page }) => {
    await expect(page.getByText(/QIP Goals/i).first()).toBeVisible({ timeout: 10000 })
  })

  test('B1.6 Centre Philosophy section visible', async ({ page }) => {
    await expect(page.getByText(/philosophy/i).first()).toBeVisible({ timeout: 10000 })
  })

  test('B1.7 QA overview references quality areas', async ({ page }) => {
    // At least one of QA1-QA7 should be referenced on the dashboard
    await expect(page.getByText(/QA[1-7]|Quality Area/i).first()).toBeVisible({ timeout: 10000 })
  })

  test('B1.11 No console errors on load', async ({ page }) => {
    const errors: string[] = []
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()) })
    await page.reload()
    await page.waitForLoadState('networkidle')
    const fatal = errors.filter(e => !e.includes('sourcemap') && !e.includes('favicon'))
    expect(fatal).toHaveLength(0)
  })
})
