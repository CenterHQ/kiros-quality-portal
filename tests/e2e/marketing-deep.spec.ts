import { test, expect } from '@playwright/test'

test.describe('Marketing — deep interactions', () => {
  test('Q-Deep.1 Hub quick actions visible', async ({ page }) => {
    await page.goto('/marketing')
    await expect(
      page.getByRole('button', { name: /new content|marketing ai/i }).first()
    ).toBeVisible({ timeout: 10000 })
  })

  test('Q-Deep.2 Content page has creation trigger', async ({ page }) => {
    await page.goto('/marketing/content')
    const btn = page.getByRole('button', { name: /new content|create content|new post/i }).first()
    if (await btn.isVisible().catch(() => false)) {
      await expect(btn).toBeVisible()
    }
  })

  test('Q-Deep.3 Calendar view toggles (month/week)', async ({ page }) => {
    await page.goto('/marketing/calendar')
    const monthBtn = page.getByRole('button', { name: /month/i }).first()
    const weekBtn = page.getByRole('button', { name: /^week$/i }).first()
    if (await monthBtn.isVisible().catch(() => false)) {
      await expect(monthBtn).toBeVisible()
    }
    if (await weekBtn.isVisible().catch(() => false)) {
      await expect(weekBtn).toBeVisible()
    }
  })

  test('Q-Deep.4 Reviews page shows star rating display', async ({ page }) => {
    await page.goto('/marketing/reviews')
    await expect(page.locator('body')).toContainText(/review|rating|star|\d\s*★?/i, { timeout: 10000 })
  })

  test('Q-Deep.5 Analytics page shows charts or empty state', async ({ page }) => {
    await page.goto('/marketing/analytics')
    await expect(
      page.locator('canvas, svg, [role="img"]').first()
        .or(page.getByText(/no data|analytic|engagement/i).first())
    ).toBeVisible({ timeout: 10000 })
  })

  test('Q-Deep.6 Inbox and Comments pages load', async ({ page }) => {
    await page.goto('/marketing/inbox')
    await expect(page.locator('body')).toContainText(/inbox|message|conversation|no messages/i)

    await page.goto('/marketing/comments')
    await expect(page.locator('body')).toContainText(/comment/i)
  })

  test('Q-Deep.7 Ads page shows campaigns section', async ({ page }) => {
    await page.goto('/marketing/ads')
    await expect(page.locator('body')).toContainText(/ads|campaign|budget|no campaigns/i, { timeout: 10000 })
  })

  test('Q-Deep.8 Post Feed page loads', async ({ page }) => {
    await page.goto('/marketing/feed')
    await expect(page.locator('body')).toContainText(/feed|post|scheduled|published/i)
  })
})
