import { test, expect } from '@playwright/test'

test.describe('Checklists', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/checklists')
  })

  test('E1.1 Page heading visible', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /operational checklists|checklists/i }).first()).toBeVisible({ timeout: 10000 })
  })

  test('E1.1 Four status tabs visible', async ({ page }) => {
    // Tabs with counts: "Today (N)", "Upcoming (N)", "History", "Tickets (N)"
    await expect(page.getByText(/today\s*\(/i).first()).toBeVisible({ timeout: 10000 })
    await expect(page.getByText(/upcoming\s*\(/i).first()).toBeVisible()
    await expect(page.getByText(/^history$/i).first()).toBeVisible()
    await expect(page.getByText(/tickets\s*\(/i).first()).toBeVisible()
  })

  test('E1.3 Create flow trigger present', async ({ page }) => {
    // Real label is "+ Assign Checklist"
    await expect(page.getByRole('button', { name: /assign checklist/i })).toBeVisible({ timeout: 10000 })
  })

  test('E1.3 Manage Templates button present', async ({ page }) => {
    await expect(page.getByRole('button', { name: /manage templates/i })).toBeVisible({ timeout: 10000 })
  })

  test('E1.5 Category filter chips visible', async ({ page }) => {
    // Filters are button chips, not a <select>
    await expect(page.getByRole('button', { name: /^all$/i })).toBeVisible({ timeout: 10000 })
    await expect(page.getByText(/safety|hygiene|compliance|health/i).first()).toBeVisible()
  })
})
