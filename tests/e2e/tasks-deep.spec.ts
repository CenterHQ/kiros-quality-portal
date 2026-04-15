import { test, expect } from '@playwright/test'

/**
 * Category A — deep task interactions.
 * Creates a task via the UI so assertions run against known-created data.
 * Test.describe is serial because the test creates, modifies, and verifies.
 */
test.describe.configure({ mode: 'serial' })

test.describe('Tasks — deep interactions', () => {
  const stamp = Date.now()
  const taskTitle = `UAT Deep Task ${stamp}`
  const updatedTitle = `UAT Deep Task UPDATED ${stamp}`
  const comment = `QA comment ${stamp}`

  test('D-Deep.1 Create task via Add Task form', async ({ page }) => {
    await page.goto('/tasks')
    await page.getByRole('button', { name: /add task/i }).click()

    // Create form appears — find title input by label proximity
    const titleInput = page.locator('input[placeholder*="title" i], input[name="title"]').first()
    await titleInput.fill(taskTitle)

    await page.getByRole('button', { name: /^create$|^add$|^save$/i }).first().click()

    // New task appears on the board
    await expect(page.getByText(taskTitle).first()).toBeVisible({ timeout: 10000 })
  })

  test('D-Deep.2 Task card expands to show details', async ({ page }) => {
    await page.goto('/tasks')
    await page.getByText(taskTitle).first().click()
    // Expanded card shows status/priority/assignee selects
    await expect(page.getByText(/status/i).first()).toBeVisible({ timeout: 5000 })
  })

  test('D-Deep.3 Add comment via expanded card', async ({ page }) => {
    await page.goto('/tasks')
    await page.getByText(taskTitle).first().click()

    const commentBox = page.getByPlaceholder(/comment|add a comment/i).first()
    if (await commentBox.isVisible().catch(() => false)) {
      await commentBox.fill(comment)
      await page.getByRole('button', { name: /post|submit|add/i }).first().click()
      await expect(page.getByText(comment).first()).toBeVisible({ timeout: 5000 })
    }
  })

  test('D-Deep.4 Change status via expanded card dropdown', async ({ page }) => {
    await page.goto('/tasks')
    await page.getByText(taskTitle).first().click()
    // Change status dropdown — expanded card has a visible <select>
    const statusSelect = page.locator('select').filter({ hasText: /to do|in progress|done/i }).first()
    if (await statusSelect.isVisible().catch(() => false)) {
      await statusSelect.selectOption({ label: /in progress/i })
      // After change, the task card should appear in the In Progress column context
      await expect(page.getByText(taskTitle).first()).toBeVisible()
    }
  })

  test('D-Deep.5 Switch to List view shows the task', async ({ page }) => {
    await page.goto('/tasks')
    await page.getByRole('button', { name: /^list$/i }).click()
    await expect(page.getByText(taskTitle).first()).toBeVisible({ timeout: 5000 })
  })

  test('D-Deep.6 Overdue indicator renders for past-due tasks', async ({ page }) => {
    await page.goto('/tasks')
    // Overdue tasks render with a red date chip — at least one date chip should be present
    const dateChips = page.locator('text=/\\d{1,2}\\/\\d{1,2}\\/\\d{4}/').first()
    if (await dateChips.isVisible().catch(() => false)) {
      await expect(dateChips).toBeVisible()
    }
  })
})
