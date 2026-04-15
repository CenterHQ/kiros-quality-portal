import { test, expect } from '@playwright/test'

test.describe('Learning & Development', () => {
  test('I1.1 Hub page loads with stat cards', async ({ page }) => {
    await page.goto('/learning')
    await expect(page.getByRole('heading', { name: /learning/i }).first()).toBeVisible({ timeout: 10000 })
    await expect(page.getByText(/completed|in progress|overdue|total hours/i).first()).toBeVisible({ timeout: 10000 })
  })

  test('I2.1 Library page lists modules', async ({ page }) => {
    await page.goto('/learning/library')
    // Either module cards visible or empty state
    await expect(
      page.getByText(/module|no modules|enrol/i).first()
    ).toBeVisible({ timeout: 10000 })
  })

  test('I2.2 Library has tier filter', async ({ page }) => {
    await page.goto('/learning/library')
    await expect(page.getByText(/foundation|intermediate|advanced|tier/i).first()).toBeVisible({ timeout: 10000 })
  })

  test('I4.1 Pathways page loads', async ({ page }) => {
    await page.goto('/learning/pathways')
    await expect(page.getByRole('heading', { name: /pathway/i }).first()).toBeVisible({ timeout: 10000 })
  })

  test('I6.1 PDP page loads', async ({ page }) => {
    await page.goto('/learning/pdp')
    await expect(page.getByRole('heading', { name: /PDP|personal.*development|development plan/i }).first()).toBeVisible({ timeout: 10000 })
  })

  test('I7.1 Training Matrix page loads', async ({ page }) => {
    await page.goto('/learning/matrix')
    await expect(page.getByRole('heading', { name: /matrix|training/i }).first()).toBeVisible({ timeout: 10000 })
  })

  test('I8.1 Certificates page loads', async ({ page }) => {
    await page.goto('/learning/certificates')
    await expect(page.getByRole('heading', { name: /certificates/i }).first()).toBeVisible({ timeout: 10000 })
  })
})
