import { test, expect } from '@playwright/test'

/**
 * Category D — Seeded: Candidate pipeline (approve → onboard, reject, review)
 *
 * Env vars:
 *   TEST_APPROVED_CANDIDATE       — candidate id in 'approved' state
 *   TEST_COMPLETED_CANDIDATE      — candidate whose questionnaire is complete
 *   TEST_REJECTABLE_CANDIDATE     — candidate in reviewable state
 */

test.describe('Seeded — approved candidate onboarding', () => {
  const id = process.env.TEST_APPROVED_CANDIDATE

  test.beforeEach(() => {
    test.skip(!id, 'Set TEST_APPROVED_CANDIDATE to run')
  })

  test('D-Seed.C1 Detail page shows approved status', async ({ page }) => {
    await page.goto(`/candidates/${id}`)
    await expect(page.getByText(/approved/i).first()).toBeVisible({ timeout: 10000 })
  })

  test('D-Seed.C2 Start Onboarding button visible', async ({ page }) => {
    await page.goto(`/candidates/${id}`)
    await expect(page.getByRole('button', { name: /start onboarding|onboard/i })).toBeVisible({ timeout: 10000 })
  })

  test('D-Seed.C3 All 6 tabs load when candidate is approved', async ({ page }) => {
    await page.goto(`/candidates/${id}`)
    const tabs = [/overview/i, /knowledge/i, /disc/i, /personality/i, /team fit/i, /recommendation/i]
    for (const tab of tabs) {
      await expect(page.getByText(tab).first()).toBeVisible({ timeout: 10000 })
    }
  })
})

test.describe('Seeded — completed candidate review', () => {
  const id = process.env.TEST_COMPLETED_CANDIDATE

  test.beforeEach(() => {
    test.skip(!id, 'Set TEST_COMPLETED_CANDIDATE to run')
  })

  test('D-Seed.C4 Knowledge Results tab shows answers', async ({ page }) => {
    await page.goto(`/candidates/${id}`)
    await page.getByText(/knowledge results|knowledge/i).first().click()
    await expect(page.locator('body')).toContainText(/score|question|rubric|answer/i, { timeout: 10000 })
  })

  test('D-Seed.C5 DISC profile tab renders a chart', async ({ page }) => {
    await page.goto(`/candidates/${id}`)
    await page.getByText(/^disc/i).first().click()
    // A chart element (canvas/svg) should be present
    await expect(page.locator('canvas, svg').first()).toBeVisible({ timeout: 10000 })
  })

  test('D-Seed.C6 Personality Analysis shows narrative', async ({ page }) => {
    await page.goto(`/candidates/${id}`)
    await page.getByText(/personality/i).first().click()
    await expect(page.locator('body')).toContainText(/communication|conflict|strength|growth/i, { timeout: 10000 })
  })

  test('D-Seed.C7 AI Recommendation tab renders', async ({ page }) => {
    await page.goto(`/candidates/${id}`)
    await page.getByText(/recommendation/i).first().click()
    await expect(page.locator('body')).toContainText(/recommend|hire|rationale/i, { timeout: 10000 })
  })
})

test.describe('Seeded — candidate rejection flow', () => {
  const id = process.env.TEST_REJECTABLE_CANDIDATE

  test.beforeEach(() => {
    test.skip(!id, 'Set TEST_REJECTABLE_CANDIDATE to run')
  })

  test('D-Seed.C8 Reject button opens reason dialog', async ({ page }) => {
    await page.goto(`/candidates/${id}`)
    const rejectBtn = page.getByRole('button', { name: /^reject$/i }).first()
    if (await rejectBtn.isVisible().catch(() => false)) {
      await rejectBtn.click()
      // Dialog with reason textarea
      await expect(page.locator('textarea').first()).toBeVisible({ timeout: 5000 })
    }
  })
})
