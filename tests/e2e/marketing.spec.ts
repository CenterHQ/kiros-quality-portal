import { test, expect } from '@playwright/test'

/**
 * UAT — Marketing surface pages.
 * All assertions are scoped to main/heading landmarks to avoid false
 * positives from sidebar nav that contains "Marketing", "Content",
 * "Calendar", "Reviews", "Ads", "Analytics" as nav items.
 */

test.describe('Marketing', () => {
  test('Q1.1 Hub page loads with heading', async ({ page }) => {
    await page.goto('/marketing')
    await expect(page.getByRole('heading', { name: /marketing hub|marketing/i }).first()).toBeVisible({ timeout: 10000 })
  })

  test('Q2.1 Content page loads with heading', async ({ page }) => {
    await page.goto('/marketing/content')
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 10000 })
  })

  test('Q3.1 Calendar page loads with heading', async ({ page }) => {
    await page.goto('/marketing/calendar')
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 10000 })
  })

  test('Q4.1 Reviews page loads with heading', async ({ page }) => {
    await page.goto('/marketing/reviews')
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 10000 })
  })

  test('Q5.1 Ads page loads with heading', async ({ page }) => {
    await page.goto('/marketing/ads')
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 10000 })
  })

  test('Q6.1 Analytics page loads with heading', async ({ page }) => {
    await page.goto('/marketing/analytics')
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 10000 })
  })
})
