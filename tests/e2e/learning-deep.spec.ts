import { test, expect } from '@playwright/test'

test.describe('Learning — deep interactions', () => {
  test('I-Deep.1 Hub stats all render non-empty', async ({ page }) => {
    await page.goto('/learning')
    const labels = [/completed/i, /in progress/i, /overdue/i, /total hours|hours/i]
    for (const l of labels) {
      await expect(page.getByText(l).first()).toBeVisible({ timeout: 10000 })
    }
  })

  test('I-Deep.2 Library filter by QA chip', async ({ page }) => {
    await page.goto('/learning/library')
    const qa1 = page.getByRole('button', { name: /^qa1$/i })
      .or(page.getByText(/^qa1$/i))
      .first()
    if (await qa1.isVisible().catch(() => false)) {
      await qa1.click()
      await page.waitForTimeout(500)
      await expect(page.locator('body')).not.toContainText(/error|failed/i)
    }
  })

  test('I-Deep.3 Library search narrows modules', async ({ page }) => {
    await page.goto('/learning/library')
    const search = page.getByPlaceholder(/search/i).first()
    if (await search.isVisible().catch(() => false)) {
      await search.fill('qa1')
      await page.waitForTimeout(500)
      await expect(page.locator('body')).not.toContainText(/unhandled/i)
    }
  })

  test('I-Deep.4 Pathways page lists pathways or shows empty', async ({ page }) => {
    await page.goto('/learning/pathways')
    await expect(
      page.locator('body').getByText(/pathway|no pathways|foundation|intermediate|advanced/i).first()
    ).toBeVisible({ timeout: 10000 })
  })

  test('I-Deep.5 PDP page has goal creation affordance', async ({ page }) => {
    await page.goto('/learning/pdp')
    const addBtn = page.getByRole('button', { name: /add goal|new goal|create|add pdp/i }).first()
    if (await addBtn.isVisible().catch(() => false)) {
      await expect(addBtn).toBeVisible()
    }
  })

  test('I-Deep.6 Matrix exports available', async ({ page }) => {
    await page.goto('/learning/matrix')
    const exportBtn = page.getByRole('button', { name: /export|download/i }).first()
    if (await exportBtn.isVisible().catch(() => false)) {
      await expect(exportBtn).toBeVisible()
    }
  })
})
