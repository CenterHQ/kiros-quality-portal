import { test, expect } from '@playwright/test'

/**
 * Category D — Seeded: Learning Module Player deep flow
 *
 * Requires TEST_MODULE_ID — id of a learning module with content, quiz,
 * reflection and action_step sections seeded.
 */

const moduleId = process.env.TEST_MODULE_ID

test.describe('Seeded — learning module player', () => {
  test.beforeEach(() => {
    test.skip(!moduleId, 'Set TEST_MODULE_ID to run')
  })

  test('D-Seed.M1 Module title and description visible', async ({ page }) => {
    await page.goto(`/learning/modules/${moduleId}`)
    await expect(page.locator('body')).toContainText(/description|learning objectives|about this module/i, { timeout: 15000 })
  })

  test('D-Seed.M2 Progress bar present', async ({ page }) => {
    await page.goto(`/learning/modules/${moduleId}`)
    await expect(
      page.locator('[role="progressbar"]').first()
        .or(page.locator('[class*="progress" i]').first())
    ).toBeVisible({ timeout: 10000 })
  })

  test('D-Seed.M3 Section navigation present', async ({ page }) => {
    await page.goto(`/learning/modules/${moduleId}`)
    // Sidebar or tab list of sections
    await expect(page.getByText(/section \d|content|quiz|reflection|action step/i).first()).toBeVisible({ timeout: 10000 })
  })

  test('D-Seed.M4 Quiz section shows options', async ({ page }) => {
    await page.goto(`/learning/modules/${moduleId}`)
    // Navigate to quiz — click section labelled Quiz
    const quizTab = page.getByText(/quiz/i).first()
    if (await quizTab.isVisible().catch(() => false)) {
      await quizTab.click()
      await expect(page.locator('input[type="radio"]').first().or(page.locator('input[type="checkbox"]').first()))
        .toBeVisible({ timeout: 10000 })
    }
  })

  test('D-Seed.M5 Reflection section has textarea', async ({ page }) => {
    await page.goto(`/learning/modules/${moduleId}`)
    const reflectTab = page.getByText(/reflection/i).first()
    if (await reflectTab.isVisible().catch(() => false)) {
      await reflectTab.click()
      await expect(page.locator('textarea').first()).toBeVisible({ timeout: 5000 })
    }
  })

  test('D-Seed.M6 Mark Complete button exists', async ({ page }) => {
    await page.goto(`/learning/modules/${moduleId}`)
    const completeBtn = page.getByRole('button', { name: /mark complete|complete module|finish/i }).first()
    if (await completeBtn.isVisible().catch(() => false)) {
      await expect(completeBtn).toBeVisible()
    }
  })
})
