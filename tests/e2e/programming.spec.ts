import { test, expect } from '@playwright/test'

/**
 * UAT — Programming (Educational Leadership) Hub
 * Pure frontend: assert on visible elements the user would recognise.
 */
test.describe('Programming Hub', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/programming')
    await expect(page).toHaveURL(/\/programming/)
  })

  test('Page heading renders', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /programming|educational/i }).first()).toBeVisible({ timeout: 10000 })
  })

  test('PDSA cycle mentioned on page', async ({ page }) => {
    // The cycle widget contains the PDSA acronym or the expanded phrase
    await expect(page.getByText(/pdsa|plan.*do.*study.*act/i).first()).toBeVisible({ timeout: 10000 })
  })

  test('New Learning Story quick action opens modal', async ({ page }) => {
    await page.getByRole('button', { name: /new learning story/i }).first().click()

    // Modal is identified by its heading text
    await expect(page.getByRole('heading', { name: /new learning story/i })).toBeVisible({ timeout: 5000 })

    // Modal contains a Room select and a Topic input (the user-visible fields)
    await expect(page.getByText(/room/i).first()).toBeVisible()
    await expect(page.getByText(/topic/i).first()).toBeVisible()
  })

  test('Quick action modal cancels cleanly', async ({ page }) => {
    await page.getByRole('button', { name: /new learning story/i }).first().click()
    await expect(page.getByRole('heading', { name: /new learning story/i })).toBeVisible({ timeout: 5000 })

    await page.getByRole('button', { name: /^cancel$/i }).click()
    await expect(page.getByRole('heading', { name: /new learning story/i })).toBeHidden()
  })
})
