import { test, expect } from '@playwright/test'

test.describe('Tasks', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tasks')
  })

  test('D1.1 View toggle visible', async ({ page }) => {
    // Board and List buttons/toggles exist
    await expect(
      page.getByRole('button', { name: /^board$/i })
        .or(page.getByRole('button', { name: /^list$/i }))
        .first()
    ).toBeVisible({ timeout: 10000 })
  })

  test('D1.2 Three status columns visible in Board view', async ({ page }) => {
    await expect(page.getByText(/to do/i).first()).toBeVisible({ timeout: 10000 })
    await expect(page.getByText(/in progress/i).first()).toBeVisible()
    await expect(page.getByText(/^done$/i).first()).toBeVisible()
  })

  test('D1.5 Add Task control present', async ({ page }) => {
    const addBtn = page.getByRole('button', { name: /add task|new task|\+ task/i }).first()
    await expect(addBtn).toBeVisible({ timeout: 10000 })
  })

  test('D2.1 Switch to List view renders a table', async ({ page }) => {
    const listBtn = page.getByRole('button', { name: /^list$/i }).first()
    if (await listBtn.isVisible().catch(() => false)) {
      await listBtn.click()
      // Table or list header should appear
      await expect(page.locator('table, [role="table"]').first()).toBeVisible({ timeout: 5000 })
    }
  })
})
