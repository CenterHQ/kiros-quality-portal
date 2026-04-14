import { test, expect } from '@playwright/test'

test.describe('Test Group 1: Sidebar & Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard')
  })

  test('1.1 Recruitment section visible in sidebar', async ({ page }) => {
    const sidebar = page.locator('nav, aside, [role="navigation"]').first()
    await expect(sidebar).toBeVisible()
    const recruitment = page.getByText(/recruitment/i).first()
    await expect(recruitment).toBeVisible({ timeout: 10000 })
  })

  test('1.2 Candidates link visible', async ({ page }) => {
    const link = page.getByRole('link', { name: /candidates/i }).first()
    await expect(link).toBeVisible()
  })

  test('1.3 Positions link visible', async ({ page }) => {
    const link = page.getByRole('link', { name: /positions/i }).first()
    await expect(link).toBeVisible()
  })

  test('1.4 Programming section visible', async ({ page }) => {
    const link = page.getByRole('link', { name: /programming/i }).first()
    await expect(link).toBeVisible()
  })

  test('1.5 AI Config accessible', async ({ page }) => {
    // Navigate directly — admin menu may be collapsed
    await page.goto('/admin/ai-config')
    await expect(page).toHaveURL(/\/admin\/ai-config/)
  })

  test('1.6 Navigating to Candidates works', async ({ page }) => {
    await page.getByRole('link', { name: /candidates/i }).first().click()
    await page.waitForURL(/\/candidates/, { timeout: 10000 })
    await expect(page).toHaveURL(/\/candidates/)
  })
})
