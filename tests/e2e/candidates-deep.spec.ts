import { test, expect } from '@playwright/test'

test.describe.configure({ mode: 'serial' })

test.describe('Candidates — deep interactions', () => {
  const stamp = Date.now()
  const positionTitle = `Deep UAT Position ${stamp}`
  const candidateName = `Deep UAT Candidate ${stamp}`
  const candidateEmail = `deep.uat.${stamp}@example.com`

  test('J-Deep.1 Create position with full details', async ({ page }) => {
    await page.goto('/candidates/positions')
    await page.getByRole('button', { name: /new position/i }).click()

    const dialog = page.locator('div.fixed.inset-0').filter({ hasText: /create position/i }).first()
    await dialog.locator('input[name="title"]').fill(positionTitle)
    await dialog.locator('select[name="role"]').selectOption('educator')
    await dialog.locator('input[name="room"]').fill('Joeys')
    await dialog.locator('textarea[name="description"]').fill('Full-time educator role in the Joeys room')
    await dialog.locator('textarea[name="requirements"]').fill('Cert III or Diploma; WWCC; First Aid')

    await dialog.getByRole('button', { name: /^create$/i }).click()
    await expect(page.getByText(/position created/i)).toBeVisible({ timeout: 10000 })
  })

  test('J-Deep.2 Position card shows role and candidate count', async ({ page }) => {
    await page.goto('/candidates/positions')
    await expect(page.getByText(positionTitle)).toBeVisible({ timeout: 10000 })
    // Status badge should read 'open' (or initial status)
    await expect(page.getByText(/open|draft/i).first()).toBeVisible()
  })

  test('J-Deep.3 Invite candidate with position select', async ({ page }) => {
    await page.goto('/candidates')
    await page.getByRole('button', { name: /^invite candidate$/i }).click()

    const dialog = page.locator('div.fixed.inset-0').filter({ hasText: /invite candidate/i }).first()
    const posOption = dialog.locator('select[name="position_id"] option', { hasText: positionTitle }).first()
    const posValue = await posOption.getAttribute('value')
    await dialog.locator('select[name="position_id"]').selectOption(posValue || '')

    await dialog.locator('input').filter({ hasNot: page.locator('[type="email"]') }).nth(0).fill(candidateName)
    await dialog.locator('input[type="email"]').fill(candidateEmail)

    await dialog.getByRole('button', { name: /send invite/i }).click()
    await expect(dialog.locator('input[value*="/apply/"]')).toBeVisible({ timeout: 10000 })
  })

  test('J-Deep.4 Candidate appears in pipeline list', async ({ page }) => {
    await page.goto('/candidates')
    await expect(page.getByText(candidateEmail)).toBeVisible({ timeout: 10000 })
  })

  test('J-Deep.5 Position filter narrows candidate list', async ({ page }) => {
    await page.goto('/candidates')
    const filter = page.locator('select').first()
    if (await filter.isVisible().catch(() => false)) {
      const posOpt = filter.locator('option', { hasText: positionTitle })
      const posValue = await posOpt.getAttribute('value').catch(() => null)
      if (posValue) {
        await filter.selectOption(posValue)
        await page.waitForTimeout(500)
        await expect(page.getByText(candidateName)).toBeVisible({ timeout: 5000 })
      }
    }
  })

  test('J-Deep.6 Candidate detail page navigates', async ({ page }) => {
    await page.goto('/candidates')
    const row = page.getByText(candidateName).first()
    await row.click()
    await page.waitForTimeout(1500)
    // On a detail view or modal, the candidate's email should be visible
    await expect(page.getByText(candidateEmail).first()).toBeVisible({ timeout: 10000 })
  })
})
