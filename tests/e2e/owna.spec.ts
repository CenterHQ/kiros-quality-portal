import { test, expect } from '@playwright/test'

test.describe('OWNA Integration', () => {
  test('P1.1 Staff page loads', async ({ page }) => {
    await page.goto('/owna/staff')
    await expect(page.getByRole('heading', { name: /staff/i }).first()).toBeVisible({ timeout: 10000 })
  })

  test('P2.1 Attendance page loads', async ({ page }) => {
    await page.goto('/owna/attendance')
    await expect(page.getByRole('heading', { name: /attendance/i }).first()).toBeVisible({ timeout: 10000 })
  })

  test('P3.1 Children page loads', async ({ page }) => {
    await page.goto('/owna/children')
    await expect(page.getByRole('heading', { name: /children/i }).first()).toBeVisible({ timeout: 10000 })
  })

  test('P4.1 Families page loads', async ({ page }) => {
    await page.goto('/owna/families')
    await expect(page.getByRole('heading', { name: /famil/i }).first()).toBeVisible({ timeout: 10000 })
  })

  test('P5.1 Enrolments page loads', async ({ page }) => {
    await page.goto('/owna/enrolments')
    await expect(page.getByRole('heading', { name: /enrol/i }).first()).toBeVisible({ timeout: 10000 })
  })

  test('P6.1 Health page loads', async ({ page }) => {
    await page.goto('/owna/health')
    await expect(page.getByRole('heading', { name: /health/i }).first()).toBeVisible({ timeout: 10000 })
  })
})
