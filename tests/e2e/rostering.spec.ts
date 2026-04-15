import { test, expect } from '@playwright/test'

test.describe('Rostering', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/rostering')
  })

  test('O1.1 Page heading visible', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /^rostering$/i }).first()).toBeVisible({ timeout: 10000 })
  })

  test('O1.1 Tab navigation visible', async ({ page }) => {
    // Real tabs: Weekly Roster, Compliance, Leave, Programming Time, Staff & Qualifications
    await expect(page.getByText(/weekly roster/i).first()).toBeVisible({ timeout: 10000 })
    await expect(page.getByText(/^compliance$/i).first()).toBeVisible()
  })

  test('O1.2 Week navigation present', async ({ page }) => {
    await expect(page.getByRole('button', { name: /previous/i })).toBeVisible({ timeout: 10000 })
    await expect(page.getByRole('button', { name: /next/i })).toBeVisible()
  })

  test('O1.5 Add Shift buttons available', async ({ page }) => {
    await expect(page.getByRole('button', { name: /add shift/i }).first()).toBeVisible({ timeout: 10000 })
  })

  test('O1.1 Room labels visible', async ({ page }) => {
    // Room names appear as row headers in the weekly grid
    await expect(page.getByText(/joeys|possums|koalas|nursery|toddlers|preschool/i).first()).toBeVisible({ timeout: 10000 })
  })
})
