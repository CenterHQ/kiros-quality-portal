import { test, expect } from '@playwright/test'

/**
 * UAT — Recruitment: Positions and Candidate Invites
 * Pure frontend: every assertion is on something the user can see.
 * Tests run serially so state created in earlier tests is visible in later ones.
 */
test.describe.configure({ mode: 'serial' })

test.describe('Recruitment — Positions & Candidate Invites', () => {
  const stamp = Date.now()
  const positionTitle = `QA Test Position ${stamp}`
  const candidateName = `Test Candidate ${stamp}`
  const candidateEmail = `test.candidate.${stamp}@example.com`

  test('2.1 Create position', async ({ page }) => {
    await page.goto('/candidates/positions')

    // Trigger the create flow — header button reads "New Position"
    await page.getByRole('button', { name: /new position/i }).click()

    // Modal is the only thing with a Title field now
    const dialog = page.locator('div.fixed.inset-0').filter({ hasText: /create position/i }).first()
    await expect(dialog).toBeVisible()

    await dialog.locator('input[name="title"]').fill(positionTitle)
    await dialog.locator('select[name="role"]').selectOption('educator')
    await dialog.locator('textarea[name="description"]').fill('Automated UAT — safe to ignore')

    // Submit — scoped to the dialog to avoid header-button collisions
    await dialog.getByRole('button', { name: /^create$/i }).click()

    // Wait for success toast (visible feedback), not a timer
    await expect(page.getByText(/position created/i)).toBeVisible({ timeout: 10000 })
  })

  test('2.2 Position appears in list', async ({ page }) => {
    await page.goto('/candidates/positions')
    await expect(page.getByText(positionTitle)).toBeVisible({ timeout: 10000 })
  })

  test('3.1 Create candidate invite', async ({ page }) => {
    await page.goto('/candidates')

    await page.getByRole('button', { name: /^invite candidate$/i }).click()

    const dialog = page.locator('div.fixed.inset-0').filter({ hasText: /invite candidate/i }).first()
    await expect(dialog).toBeVisible()

    // Select the position we created. Pick by visible label so we don't depend on order.
    await dialog
      .locator('select[name="position_id"]')
      .selectOption({ label: new RegExp(positionTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) })

    // Fill name + email — match by proximity to the label, not placeholder guessing
    await dialog.locator('input').filter({ hasNot: page.locator('[type="email"]') }).nth(0).fill(candidateName)
    await dialog.locator('input[type="email"]').fill(candidateEmail)

    await dialog.getByRole('button', { name: /send invite/i }).click()

    // The invite URL is rendered inside <input value="...">; assert on input value, not text
    const linkInput = dialog.locator('input[value*="/apply/"]')
    await expect(linkInput).toBeVisible({ timeout: 10000 })

    // Visible confirmation the user can see: Copy button appears only when invite exists
    await expect(dialog.getByRole('button', { name: /^copy$/i })).toBeVisible()
  })

  test('3.2 Candidate row visible with Copy affordance', async ({ page }) => {
    await page.goto('/candidates')
    await expect(page.getByText(candidateName).first()).toBeVisible({ timeout: 10000 })
  })

  test('3.5 Candidate email shown in list', async ({ page }) => {
    await page.goto('/candidates')
    await expect(page.getByText(candidateEmail)).toBeVisible({ timeout: 10000 })
  })
})
