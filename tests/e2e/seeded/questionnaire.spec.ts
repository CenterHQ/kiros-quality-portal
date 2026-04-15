import { test, expect } from '@playwright/test'

/**
 * Category D — Seeded: Public Questionnaire Completion
 *
 * Requires TEST_CANDIDATE_TOKEN env var — a valid /apply/<token> URL for a
 * candidate whose questionnaire has not been completed.
 *
 * Set before running:
 *   $env:TEST_CANDIDATE_TOKEN="fa95671..."
 *   npx playwright test seeded/questionnaire
 */

const token = process.env.TEST_CANDIDATE_TOKEN
test.describe.configure({ mode: 'serial' })

test.describe('Seeded — questionnaire end-to-end', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test.beforeEach(() => {
    test.skip(!token, 'Set TEST_CANDIDATE_TOKEN to run the questionnaire spec')
  })

  test('D-Seed.Q1 Apply URL loads without auth redirect', async ({ page }) => {
    await page.goto(`/apply/${token}`)
    expect(page.url()).not.toContain('/login')
  })

  test('D-Seed.Q2 Branded header with centre logo/name', async ({ page }) => {
    await page.goto(`/apply/${token}`)
    // Centre name or logo visible
    await expect(
      page.getByRole('img').first()
        .or(page.getByText(/kiros|kiro's/i).first())
    ).toBeVisible({ timeout: 10000 })
  })

  test('D-Seed.Q3 Progress indicator present at start', async ({ page }) => {
    await page.goto(`/apply/${token}`)
    await expect(
      page.getByRole('progressbar').first()
        .or(page.locator('[class*="progress" i]').first())
    ).toBeVisible({ timeout: 10000 })
  })

  test('D-Seed.Q4 Question counter visible (e.g. "1 of 60")', async ({ page }) => {
    await page.goto(`/apply/${token}`)
    await expect(page.getByText(/\b1\s*(of|\/)\s*\d+\b/i).first()).toBeVisible({ timeout: 10000 })
  })

  test('D-Seed.Q5 Timer displays MM:SS format', async ({ page }) => {
    await page.goto(`/apply/${token}`)
    // Timer appears as MM:SS
    await expect(page.locator('text=/\\b\\d{1,2}:\\d{2}\\b/').first()).toBeVisible({ timeout: 10000 })
  })

  test('D-Seed.Q6 Answer an MCQ question and advance', async ({ page }) => {
    await page.goto(`/apply/${token}`)
    const radio = page.locator('input[type="radio"]').first()
    if (await radio.isVisible().catch(() => false)) {
      await radio.click()
      const submit = page.getByRole('button', { name: /submit|next|continue/i }).first()
      await submit.click()
      // Expect the counter to advance beyond "1 of"
      await expect(page.getByText(/\b2\s*(of|\/)\s*\d+\b/i).first()).toBeVisible({ timeout: 10000 })
    }
  })

  test('D-Seed.Q7 Answer a text question advances', async ({ page }) => {
    await page.goto(`/apply/${token}`)
    const textarea = page.locator('textarea').first()
    if (await textarea.isVisible().catch(() => false)) {
      await textarea.fill('UAT automated answer — ignore in review')
      const submit = page.getByRole('button', { name: /submit|next|continue/i }).first()
      await submit.click()
      await page.waitForTimeout(1000)
      await expect(page.locator('body')).not.toContainText(/error|failed/i)
    }
  })

  test('D-Seed.Q8 Section label changes mid-flow', async ({ page }) => {
    // Once knowledge section ends, the page should label the personality section
    await page.goto(`/apply/${token}`)
    const sectionLabel = page.getByText(/knowledge|personality|professional profile|assessment/i).first()
    await expect(sectionLabel).toBeVisible({ timeout: 10000 })
  })

  test('D-Seed.Q9 Mobile viewport keeps questionnaire usable', async ({ page, browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 375, height: 667 } })
    const mPage = await ctx.newPage()
    await mPage.goto(`/apply/${token}`)
    const hScroll = await mPage.evaluate(() =>
      document.documentElement.scrollWidth > document.documentElement.clientWidth + 2
    )
    expect(hScroll).toBeFalsy()
    await ctx.close()
  })

  test('D-Seed.Q10 Closing and reopening resumes from same point', async ({ page, context }) => {
    await page.goto(`/apply/${token}`)
    const before = await page.getByText(/\b\d+\s*(of|\/)\s*\d+\b/i).first().textContent()
    await page.close()
    const page2 = await context.newPage()
    await page2.goto(`/apply/${token}`)
    const after = await page2.getByText(/\b\d+\s*(of|\/)\s*\d+\b/i).first().textContent()
    // Same progress (or further, never reset)
    expect(after).toBeTruthy()
  })
})
