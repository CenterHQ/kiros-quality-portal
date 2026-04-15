import { test, expect } from '@playwright/test'

test.describe('Marketing', () => {
  test('Q1.1 Hub page loads', async ({ page }) => {
    await page.goto('/marketing')
    await expect(page.getByRole('heading', { name: /marketing/i }).first()).toBeVisible({ timeout: 10000 })
  })

  test('Q2.1 Content page loads', async ({ page }) => {
    await page.goto('/marketing/content')
    await expect(page.locator('body')).toContainText(/content|post/i, { timeout: 10000 })
  })

  test('Q3.1 Calendar page loads', async ({ page }) => {
    await page.goto('/marketing/calendar')
    await expect(page.locator('body')).toContainText(/calendar|schedule/i, { timeout: 10000 })
  })

  test('Q4.1 Reviews page loads', async ({ page }) => {
    await page.goto('/marketing/reviews')
    await expect(page.locator('body')).toContainText(/review/i, { timeout: 10000 })
  })

  test('Q5.1 Ads page loads', async ({ page }) => {
    await page.goto('/marketing/ads')
    await expect(page.locator('body')).toContainText(/ads|campaign/i, { timeout: 10000 })
  })

  test('Q6.1 Analytics page loads', async ({ page }) => {
    await page.goto('/marketing/analytics')
    await expect(page.locator('body')).toContainText(/analytic|engagement|performance/i, { timeout: 10000 })
  })
})
