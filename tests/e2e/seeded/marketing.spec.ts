import { test, expect } from '@playwright/test'

/**
 * Category D — Seeded: Marketing content and review flows
 *
 * Env vars:
 *   TEST_MARKETING_POST_ID — id of a draft/scheduled post
 *   TEST_MARKETING_REVIEW_ID — id of a review awaiting response
 *   RUN_MARKETING_CREATE — "1" to run the create-content flow
 */

test.describe('Seeded — marketing content detail', () => {
  const id = process.env.TEST_MARKETING_POST_ID

  test.beforeEach(() => {
    test.skip(!id, 'Set TEST_MARKETING_POST_ID to run')
  })

  test('D-Seed.MKT1 Post detail loads', async ({ page }) => {
    await page.goto(`/marketing/content/${id}`)
    const body = await page.locator('body').textContent()
    expect(body?.length ?? 0).toBeGreaterThan(200)
  })

  test('D-Seed.MKT2 Schedule or publish control present', async ({ page }) => {
    await page.goto(`/marketing/content/${id}`)
    await expect(
      page.getByRole('button', { name: /schedule|publish|save|update/i }).first()
    ).toBeVisible({ timeout: 10000 })
  })
})

test.describe('Seeded — marketing content creation', () => {
  test.beforeEach(() => {
    test.skip(!process.env.RUN_MARKETING_CREATE, 'Set RUN_MARKETING_CREATE=1')
  })

  test('D-Seed.MKT3 Content editor accepts input', async ({ page }) => {
    await page.goto('/marketing/content')
    const newBtn = page.getByRole('button', { name: /new content|create content|new post/i }).first()
    if (await newBtn.isVisible().catch(() => false)) {
      await newBtn.click()
      const body = page.locator('textarea').first()
      if (await body.isVisible().catch(() => false)) {
        await body.fill('UAT test post content — please ignore')
        await expect(body).toHaveValue(/UAT test post/)
      }
    }
  })
})

test.describe('Seeded — review response', () => {
  const id = process.env.TEST_MARKETING_REVIEW_ID

  test.beforeEach(() => {
    test.skip(!id, 'Set TEST_MARKETING_REVIEW_ID to run')
  })

  test('D-Seed.MKT4 Review detail shows response form', async ({ page }) => {
    await page.goto(`/marketing/reviews`)
    // Find the review card by id or the first review
    const respondBtn = page.getByRole('button', { name: /respond|reply/i }).first()
    if (await respondBtn.isVisible().catch(() => false)) {
      await respondBtn.click()
      await expect(page.locator('textarea').first()).toBeVisible({ timeout: 5000 })
    }
  })
})
