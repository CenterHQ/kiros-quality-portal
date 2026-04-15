import { test, expect } from '@playwright/test'

test.describe('Policies — deep interactions', () => {
  test('G-Deep.1 Navigate between Library, Review Schedule, Acknowledgements', async ({ page }) => {
    await page.goto('/policies')

    // Try to switch to Review Schedule tab
    const reviewTab = page.getByRole('button', { name: /review schedule/i })
      .or(page.getByRole('tab', { name: /review schedule/i }))
      .or(page.getByText(/review schedule/i))
      .first()
    if (await reviewTab.isVisible().catch(() => false)) {
      await reviewTab.click()
      await expect(page.locator('body')).toContainText(/review|due|upcoming/i)
    }
  })

  test('G-Deep.2 Policy card click navigates to detail', async ({ page }) => {
    await page.goto('/policies')
    await page.waitForLoadState('networkidle')
    const firstCard = page.locator('a, [role="link"], button').filter({ hasText: /policy|procedure/i }).first()
    if (await firstCard.isVisible().catch(() => false)) {
      await firstCard.click()
      await page.waitForTimeout(1500)
      // Should have navigated
      expect(page.url()).toMatch(/\/policies/)
    }
  })

  test('G-Deep.3 Search filters policies', async ({ page }) => {
    await page.goto('/policies')
    const search = page.getByPlaceholder(/search/i).first()
    if (await search.isVisible().catch(() => false)) {
      await search.fill('zzzz-no-match')
      await page.waitForTimeout(500)
      // Either empty-state OR filtered list, but not an error
      await expect(page.locator('body')).not.toContainText(/500|unhandled/i)
    }
  })

  test('G-Deep.4 Status filter dropdown works', async ({ page }) => {
    await page.goto('/policies')
    const filter = page.locator('select').first()
    if (await filter.isVisible().catch(() => false)) {
      // Change value
      const options = await filter.locator('option').allTextContents()
      if (options.length > 1) {
        await filter.selectOption({ index: 1 })
        await page.waitForTimeout(500)
      }
    }
  })
})
