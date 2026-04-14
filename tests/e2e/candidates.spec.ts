import { test, expect } from '@playwright/test'

test.describe('Test Groups 2-3: Positions & Candidate Invites', () => {
  const positionTitle = `QA Test Position ${Date.now()}`
  const candidateName = `Test Candidate ${Date.now()}`
  const candidateEmail = `test.candidate.${Date.now()}@example.com`

  test('2.1 Create position', async ({ page }) => {
    await page.goto('/candidates/positions')

    // Open create position dialog/page
    const createBtn = page.getByRole('button', { name: /create position|new position|add position/i }).first()
    if (await createBtn.isVisible().catch(() => false)) {
      await createBtn.click()
    } else {
      await page.goto('/candidates/positions/new')
    }

    // Fill title
    const titleInput = page.locator('input[name="title"], input[placeholder*="title" i]').first()
    await titleInput.fill(positionTitle)

    // Role select
    const roleSelect = page.locator('select[name="role"], [data-testid="role-select"]').first()
    if (await roleSelect.isVisible().catch(() => false)) {
      await roleSelect.selectOption({ label: /educator/i }).catch(async () => {
        await roleSelect.selectOption('educator').catch(() => {})
      })
    }

    // Description
    const desc = page.locator('textarea[name="description"], textarea[placeholder*="description" i]').first()
    if (await desc.isVisible().catch(() => false)) {
      await desc.fill('Automated test position — please ignore')
    }

    await page.getByRole('button', { name: /save|create|submit/i }).first().click()
    await page.waitForTimeout(1500)
  })

  test('2.2 Position appears in list', async ({ page }) => {
    await page.goto('/candidates/positions')
    await expect(page.getByText(positionTitle)).toBeVisible({ timeout: 10000 })
  })

  test('3.1 Create candidate invite', async ({ page }) => {
    await page.goto('/candidates')

    const inviteBtn = page.getByRole('button', { name: /invite candidate|new candidate|invite/i }).first()
    await inviteBtn.click()

    await page.locator('input[name="full_name"], input[name="name"], input[placeholder*="name" i]').first().fill(candidateName)
    await page.locator('input[type="email"]').first().fill(candidateEmail)

    // Position select
    const posSelect = page.locator('select[name="position_id"], [data-testid="position-select"]').first()
    if (await posSelect.isVisible().catch(() => false)) {
      await posSelect.selectOption({ index: 1 }).catch(() => {})
    }

    await page.getByRole('button', { name: /submit|create invite|send invite|create/i }).first().click()

    // Verify invite URL shown
    const urlText = page.locator('text=/\\/apply\\//').first()
    await expect(urlText).toBeVisible({ timeout: 10000 })
  })

  test('3.2 Copy link button exists', async ({ page }) => {
    await page.goto('/candidates')
    await expect(page.getByText(candidateName).first()).toBeVisible({ timeout: 10000 })
    // Check for copy button somewhere on page
    const copyBtn = page.getByRole('button', { name: /copy/i }).first()
    await expect(copyBtn).toBeVisible()
  })

  test('3.5 Candidate appears in list', async ({ page }) => {
    await page.goto('/candidates')
    await expect(page.getByText(candidateEmail)).toBeVisible({ timeout: 10000 })
  })
})
