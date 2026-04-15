import { test, expect } from '@playwright/test'

test.describe('Tasks', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tasks')
  })

  test('D1.1 Page heading visible', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /task board/i }).first()).toBeVisible({ timeout: 10000 })
  })

  test('D1.1 View toggle visible', async ({ page }) => {
    await expect(page.getByRole('button', { name: /^board$/i })).toBeVisible({ timeout: 10000 })
    await expect(page.getByRole('button', { name: /^list$/i })).toBeVisible()
  })

  test('D1.2 Three status columns visible in Board view', async ({ page }) => {
    // Column labels are plain text inside the column containers
    await expect(page.getByText('To Do', { exact: true }).first()).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('In Progress', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('Done', { exact: true }).first()).toBeVisible()
  })

  test('D1.5 Add Task control present', async ({ page }) => {
    await expect(page.getByRole('button', { name: /add task/i })).toBeVisible({ timeout: 10000 })
  })

  test('D2.1 Switch to List view renders table headers', async ({ page }) => {
    await page.getByRole('button', { name: /^list$/i }).click()
    // Column headers from the real list view: TASK, STATUS, PRIORITY, ASSIGNED TO, DUE DATE
    await expect(page.getByText(/^STATUS$/i).first()).toBeVisible({ timeout: 5000 })
    await expect(page.getByText(/^PRIORITY$/i).first()).toBeVisible()
    await expect(page.getByText(/^DUE DATE$/i).first()).toBeVisible()
  })
})
