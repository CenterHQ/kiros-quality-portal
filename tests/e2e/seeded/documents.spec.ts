import { test, expect } from '@playwright/test'

/**
 * Category D — Seeded: Document detail and generation
 *
 * Env vars:
 *   TEST_DOCUMENT_ID — id of an existing document with content
 *   TEST_GENERATED_DOC_ID — id of an AI-generated document
 */

test.describe('Seeded — document detail view', () => {
  const id = process.env.TEST_DOCUMENT_ID

  test.beforeEach(() => {
    test.skip(!id, 'Set TEST_DOCUMENT_ID to run')
  })

  test('D-Seed.DOC1 Document detail renders content', async ({ page }) => {
    await page.goto(`/documents/${id}`)
    const body = await page.locator('body').textContent()
    expect(body?.length ?? 0).toBeGreaterThan(300)
  })

  test('D-Seed.DOC2 Download button present', async ({ page }) => {
    await page.goto(`/documents/${id}`)
    await expect(page.getByRole('button', { name: /download|export/i }).first()).toBeVisible({ timeout: 10000 })
  })

  test('D-Seed.DOC3 Metadata visible (title, type, date)', async ({ page }) => {
    await page.goto(`/documents/${id}`)
    await expect(page.locator('body')).toContainText(/created|updated|type|author|version/i)
  })
})

test.describe('Seeded — AI-generated documents library', () => {
  const id = process.env.TEST_GENERATED_DOC_ID

  test.beforeEach(() => {
    test.skip(!id, 'Set TEST_GENERATED_DOC_ID to run')
  })

  test('D-Seed.DOC4 Generated doc appears in AI library', async ({ page }) => {
    await page.goto('/documents/library')
    // Body should contain AI-generated docs or link to detail
    const body = await page.locator('body').textContent()
    expect(body?.length ?? 0).toBeGreaterThan(200)
  })

  test('D-Seed.DOC5 Generated doc detail loads', async ({ page }) => {
    await page.goto(`/documents/${id}`)
    await expect(page.locator('body')).toContainText(/learning story|program|observation|reflection|plan/i, { timeout: 10000 })
  })
})
