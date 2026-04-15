import { test, expect } from '@playwright/test'

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/dashboard/)
  })

  test('B1.1 Page header visible', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /^dashboard$/i }).first()).toBeVisible({ timeout: 10000 })
  })

  test('B1.3 Four stat card labels visible', async ({ page }) => {
    // Real card labels from live page
    await expect(page.getByText(/Overall Rating/i)).toBeVisible({ timeout: 10000 })
    await expect(page.getByText(/Elements Not Met/i)).toBeVisible()
    await expect(page.getByText(/Tasks Completed/i)).toBeVisible()
    await expect(page.getByText(/Compliance Actions/i)).toBeVisible()
  })

  test('B1.4 QIP Goals section visible', async ({ page }) => {
    await expect(page.getByText(/QIP Goals/i).first()).toBeVisible({ timeout: 10000 })
  })

  test('B1.6 Centre Philosophy section visible', async ({ page }) => {
    // The dashboard renders a K.I.R.O.S philosophy quote block
    await expect(page.getByText(/K\.I\.R\.O\.S|philosophy|openness/i).first()).toBeVisible({ timeout: 10000 })
  })

  test('B1.7 QA overview references quality areas', async ({ page }) => {
    await expect(page.getByText(/QA[1-7]|Quality Area|Working Towards/i).first()).toBeVisible({ timeout: 10000 })
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
