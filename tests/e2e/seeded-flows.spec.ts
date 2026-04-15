import { test, expect } from '@playwright/test'

/**
 * Category D — seed-data-gated deep flows.
 * Each test skips unless the relevant env var is set, pointing to
 * pre-existing fixture data. This lets the full flow be exercised in UAT
 * runs where the tester has staged the data, without blocking CI on a
 * missing seed.
 *
 * Env vars:
 *   TEST_CANDIDATE_TOKEN    — valid /apply token for a seeded candidate
 *   TEST_MODULE_ID          — a learning module with quiz sections
 *   TEST_APPROVED_CANDIDATE — candidate id in 'approved' state (pre-onboarding)
 *   TEST_DRAFT_POLICY_ID    — policy in draft status (for publish flow)
 */

test.describe('Seeded flows — public questionnaire', () => {
  const token = process.env.TEST_CANDIDATE_TOKEN

  test('Valid token shows the first question', async ({ page }) => {
    test.skip(!token, 'Set TEST_CANDIDATE_TOKEN to run')
    await page.context().clearCookies()
    await page.goto(`/apply/${token}`)
    // Should see a progress indicator and question text
    await expect(page.locator('body')).toContainText(/question|welcome|assessment/i, { timeout: 15000 })
  })

  test('Timer visible on first question', async ({ page }) => {
    test.skip(!token, 'Set TEST_CANDIDATE_TOKEN to run')
    await page.context().clearCookies()
    await page.goto(`/apply/${token}`)
    // Look for a countdown style element or time display
    await expect(
      page.locator('text=/\\d+:\\d{2}/').first()
        .or(page.getByRole('progressbar').first())
    ).toBeVisible({ timeout: 10000 })
  })

  test('Answer first question advances progress', async ({ page }) => {
    test.skip(!token, 'Set TEST_CANDIDATE_TOKEN to run')
    await page.context().clearCookies()
    await page.goto(`/apply/${token}`)

    // Attempt to answer — either click first radio option, fill textarea, or select scale
    const radio = page.locator('input[type="radio"]').first()
    const textarea = page.locator('textarea').first()

    if (await radio.isVisible().catch(() => false)) {
      await radio.click()
    } else if (await textarea.isVisible().catch(() => false)) {
      await textarea.fill('UAT answer text')
    }

    const submit = page.getByRole('button', { name: /submit|next/i }).first()
    if (await submit.isVisible().catch(() => false)) {
      await submit.click()
      await page.waitForTimeout(1000)
      // Progress or next question appears
      await expect(page.locator('body')).not.toContainText(/error|failed/i)
    }
  })
})

test.describe('Seeded flows — learning module player', () => {
  const moduleId = process.env.TEST_MODULE_ID

  test('Module loads with sections', async ({ page }) => {
    test.skip(!moduleId, 'Set TEST_MODULE_ID to run')
    await page.goto(`/learning/modules/${moduleId}`)
    await expect(page.locator('body')).toContainText(/module|section|content|quiz/i, { timeout: 15000 })
  })

  test('Module player has progress indicator', async ({ page }) => {
    test.skip(!moduleId, 'Set TEST_MODULE_ID to run')
    await page.goto(`/learning/modules/${moduleId}`)
    await expect(
      page.locator('[role="progressbar"], .progress, [class*="progress"]').first()
    ).toBeVisible({ timeout: 10000 })
  })
})

test.describe('Seeded flows — approved candidate onboarding', () => {
  const candidateId = process.env.TEST_APPROVED_CANDIDATE

  test('Approved candidate detail shows Start Onboarding button', async ({ page }) => {
    test.skip(!candidateId, 'Set TEST_APPROVED_CANDIDATE to run')
    await page.goto(`/candidates/${candidateId}`)
    await expect(page.getByRole('button', { name: /start onboarding|onboard/i })).toBeVisible({ timeout: 10000 })
  })
})

test.describe('Seeded flows — policy publication', () => {
  const policyId = process.env.TEST_DRAFT_POLICY_ID

  test('Draft policy shows Submit for Review or Publish button', async ({ page }) => {
    test.skip(!policyId, 'Set TEST_DRAFT_POLICY_ID to run')
    await page.goto(`/policies/${policyId}`)
    await expect(
      page.getByRole('button', { name: /publish|submit for review|approve/i }).first()
    ).toBeVisible({ timeout: 10000 })
  })
})

test.describe('Seeded flows — agent testing', () => {
  test('Admin can trigger a test run on an agent', async ({ page }) => {
    test.skip(!process.env.RUN_AGENT_TEST, 'Set RUN_AGENT_TEST=1 to run')
    await page.goto('/admin/agents')

    // Expand first agent
    await page.getByText(/QA1 Agent/i).first().click()
    // Fill test prompt
    const promptInput = page.locator('textarea').last()
    if (await promptInput.isVisible().catch(() => false)) {
      await promptInput.fill('What is QA1?')
      const runBtn = page.getByRole('button', { name: /run test|test agent/i }).first()
      if (await runBtn.isVisible().catch(() => false)) {
        await runBtn.click()
        await page.waitForTimeout(10000) // Agent responses take time
        await expect(page.locator('body')).toContainText(/QA1|educational|response/i)
      }
    }
  })
})
