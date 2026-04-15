import { test, expect } from '@playwright/test'

test.describe('Rostering', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/rostering')
  })

  test('O1.1 Page heading visible', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /^rostering$/i }).first()).toBeVisible({ timeout: 10000 })
  })

  test('O1.1 Tab navigation visible', async ({ page }) => {
    await expect(page.getByText(/weekly roster/i).first()).toBeVisible({ timeout: 10000 })
    await expect(page.getByText(/^compliance$/i).first()).toBeVisible()
  })

  test('O1.2 Previous/Next week navigation present', async ({ page }) => {
    // Exact match to disambiguate "Previous" from "Copy Previous Week"
    await expect(page.getByRole('button', { name: /^← previous$/i })).toBeVisible({ timeout: 10000 })
    await expect(page.getByRole('button', { name: /^next →$/i })).toBeVisible()
  })

  test('O1.5 Room management button present', async ({ page }) => {
    // "+ Room" button to add rooms for rostering
    await expect(page.getByRole('button', { name: /\+ room/i })).toBeVisible({ timeout: 10000 })
  })

  test('O1.5 Publish Week button present', async ({ page }) => {
    await expect(page.getByRole('button', { name: /publish week/i })).toBeVisible({ timeout: 10000 })
  })
})
