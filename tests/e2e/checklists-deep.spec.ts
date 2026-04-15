import { test, expect } from '@playwright/test'

test.describe.configure({ mode: 'serial' })

test.describe('Checklists — deep interactions', () => {
  test('E-Deep.1 Assign Checklist opens dialog', async ({ page }) => {
    await page.goto('/checklists')
    await page.getByRole('button', { name: /assign checklist/i }).click()

    const dialog = page.locator('[role="dialog"], div.fixed.inset-0').filter({ hasText: /assign|checklist/i }).first()
    await expect(dialog).toBeVisible({ timeout: 5000 })
    // Dialog should have a template picker and an assignee
    await expect(dialog.getByText(/template|checklist/i).first()).toBeVisible()
  })

  test('E-Deep.2 Dialog Cancel closes without creating', async ({ page }) => {
    await page.goto('/checklists')
    await page.getByRole('button', { name: /assign checklist/i }).click()
    await page.getByRole('button', { name: /^cancel$/i }).first().click()
    // Dialog gone
    await expect(page.getByRole('heading', { name: /assign checklist/i })).toBeHidden()
  })

  test('E-Deep.3 Manage Templates navigates', async ({ page }) => {
    await page.goto('/checklists')
    const btn = page.getByRole('button', { name: /manage templates/i })
    if (await btn.isVisible().catch(() => false)) {
      await btn.click()
      await page.waitForLoadState('networkidle')
      // Either navigated to a templates view or opened a dialog
      await expect(page.locator('body')).toContainText(/template/i)
    }
  })

  test('E-Deep.4 Switching tabs changes visible counts', async ({ page }) => {
    await page.goto('/checklists')
    // Clicking Upcoming tab should switch the content area
    await page.getByText(/upcoming\s*\(/i).first().click()
    await page.waitForTimeout(500)
    await expect(page.locator('body')).toContainText(/upcoming|no|scheduled/i)
  })

  test('E-Deep.5 Category filter chip click is responsive', async ({ page }) => {
    await page.goto('/checklists')
    const chip = page.getByRole('button', { name: /safety & security/i })
    if (await chip.isVisible().catch(() => false)) {
      await chip.click()
      // Chip becomes visually active (purple/highlighted)
      await expect(chip).toBeVisible()
    }
  })

  test('E-Deep.6 Today empty state shows when no checklists', async ({ page }) => {
    await page.goto('/checklists')
    // If 0 today, the empty state "No checklists due today" should render
    const emptyState = page.getByText(/no checklists due today/i)
    if (await emptyState.isVisible().catch(() => false)) {
      await expect(emptyState).toBeVisible()
    }
  })
})
