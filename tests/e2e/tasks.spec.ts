import { test, expect } from '@playwright/test'

test.describe('Tasks', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tasks')
  })

  test('D1.1 Page loads with heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /task board/i }).first()).toBeVisible({ timeout: 10000 })
  })

  test('D1.1 View toggle visible', async ({ page }) => {
    // Board and List toggle buttons are in the header
    await expect(page.getByRole('button', { name: /^board$/i })).toBeVisible({ timeout: 10000 })
    await expect(page.getByRole('button', { name: /^list$/i })).toBeVisible()
  })

  test('D1.2 Three status columns visible in Board view', async ({ page }) => {
    // Scope to main content area (not sidebar nav which may contain similar words)
    const main = page.locator('main, [role="main"]').first().or(page.locator('body'))
    await expect(main.getByRole('heading', { name: /^to do$/i }).or(main.locator('text=/^To Do$/').first())).toBeVisible({ timeout: 10000 })
    await expect(main.getByText(/^In Progress$/).first()).toBeVisible()
    await expect(main.getByText(/^Done$/).first()).toBeVisible()
  })

  test('D1.5 Add Task control present', async ({ page }) => {
    // Button label is literally "+ Add Task"
    await expect(page.getByRole('button', { name: /add task/i })).toBeVisible({ timeout: 10000 })
  })

  test('D2.1 Switch to List view renders tasks', async ({ page }) => {
    await page.getByRole('button', { name: /^list$/i }).click()
    // After switching, the urgency chips or task titles should still be visible
    await expect(page.getByText(/urgent|high|medium|low/i).first()).toBeVisible({ timeout: 5000 })
  })
})
