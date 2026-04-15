import { test, expect } from '@playwright/test'

/**
 * Category D — Seeded: Rostering with rooms and shifts
 *
 * Env vars:
 *   TEST_ROSTERED_DATE — yyyy-mm-dd with shifts already assigned
 *   RUN_ROSTER_FLOW — "1" to run the full shift-creation flow
 */

test.describe('Seeded — rostering views', () => {
  test.beforeEach(() => {
    test.skip(!process.env.TEST_ROSTERED_DATE && !process.env.RUN_ROSTER_FLOW, 'Set TEST_ROSTERED_DATE or RUN_ROSTER_FLOW')
  })

  test('D-Seed.R1 Weekly grid shows rooms and days', async ({ page }) => {
    await page.goto('/rostering')
    await expect(page.getByText(/joeys|possums|koalas|nursery|toddlers|preschool/i).first()).toBeVisible({ timeout: 10000 })
    // Day headers
    await expect(page.getByText(/mon|tue|wed|thu|fri/i).first()).toBeVisible()
  })

  test('D-Seed.R2 Compliance tab shows coverage status', async ({ page }) => {
    await page.goto('/rostering')
    const tab = page.getByText(/^compliance$/i).first()
    if (await tab.isVisible().catch(() => false)) {
      await tab.click()
      await expect(page.locator('body')).toContainText(/coverage|ratio|compliant|understaff/i, { timeout: 10000 })
    }
  })

  test('D-Seed.R3 Staff & Qualifications tab loads', async ({ page }) => {
    await page.goto('/rostering')
    const tab = page.getByText(/staff & qualifications/i).first()
    if (await tab.isVisible().catch(() => false)) {
      await tab.click()
      await expect(page.locator('body')).toContainText(/qualif|cert|first aid|wwcc/i, { timeout: 10000 })
    }
  })

  test('D-Seed.R4 Add Shift modal opens', async ({ page }) => {
    test.skip(!process.env.RUN_ROSTER_FLOW, 'Set RUN_ROSTER_FLOW=1')
    await page.goto('/rostering')
    const addShift = page.getByRole('button', { name: /\+ add shift/i }).first()
    if (await addShift.isVisible().catch(() => false)) {
      await addShift.click()
      await expect(page.locator('input[type="time"], select, input[name]').first()).toBeVisible({ timeout: 5000 })
    }
  })
})
