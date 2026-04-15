import { test, expect } from '@playwright/test'

/**
 * Category D — Seeded: Policy lifecycle (draft → review → published → acknowledge)
 *
 * Env vars:
 *   TEST_DRAFT_POLICY_ID      — policy in draft status
 *   TEST_PUBLISHED_POLICY_ID  — policy in published status (for ack flow)
 */

test.describe('Seeded — draft policy publication', () => {
  const id = process.env.TEST_DRAFT_POLICY_ID

  test.beforeEach(() => {
    test.skip(!id, 'Set TEST_DRAFT_POLICY_ID to run')
  })

  test('D-Seed.P1 Draft policy detail shows publish controls', async ({ page }) => {
    await page.goto(`/policies/${id}`)
    await expect(
      page.getByRole('button', { name: /publish|submit for review|approve/i }).first()
    ).toBeVisible({ timeout: 10000 })
  })

  test('D-Seed.P2 Draft status badge visible', async ({ page }) => {
    await page.goto(`/policies/${id}`)
    await expect(page.getByText(/^draft$/i).first()).toBeVisible({ timeout: 10000 })
  })

  test('D-Seed.P3 Edit button present for draft', async ({ page }) => {
    await page.goto(`/policies/${id}`)
    await expect(page.getByRole('button', { name: /^edit$/i }).first()).toBeVisible({ timeout: 10000 })
  })
})

test.describe('Seeded — published policy acknowledgement', () => {
  const id = process.env.TEST_PUBLISHED_POLICY_ID

  test.beforeEach(() => {
    test.skip(!id, 'Set TEST_PUBLISHED_POLICY_ID to run')
  })

  test('D-Seed.P4 Acknowledge button or already-ack label visible', async ({ page }) => {
    await page.goto(`/policies/${id}`)
    await expect(
      page.getByRole('button', { name: /acknowledge|^ack/i }).first()
        .or(page.getByText(/you acknowledged|acknowledged on/i).first())
    ).toBeVisible({ timeout: 10000 })
  })

  test('D-Seed.P5 Published badge visible', async ({ page }) => {
    await page.goto(`/policies/${id}`)
    await expect(page.getByText(/^published$/i).first()).toBeVisible({ timeout: 10000 })
  })

  test('D-Seed.P6 Policy content rendered', async ({ page }) => {
    await page.goto(`/policies/${id}`)
    // Body has substantial text
    const body = await page.locator('body').textContent()
    expect(body?.length ?? 0).toBeGreaterThan(300)
  })
})
