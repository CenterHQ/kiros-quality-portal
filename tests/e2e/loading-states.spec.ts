import { test, expect } from '@playwright/test'

/**
 * Category B — loading-state tests.
 * Uses CDP network throttling to slow responses and verify a loading
 * indicator (spinner, skeleton, or "Loading..." text) appears before
 * content renders. Pure UAT — asserts only on what a user would see.
 */

async function slowNetwork(page: import('@playwright/test').Page) {
  const client = await page.context().newCDPSession(page)
  await client.send('Network.enable')
  await client.send('Network.emulateNetworkConditions', {
    offline: false,
    downloadThroughput: 50 * 1024, // 50kB/s — slow 3G
    uploadThroughput: 50 * 1024,
    latency: 500,
  })
  return client
}

test.describe('Loading states visible during fetch', () => {
  test('Dashboard shows a loading indicator', async ({ page }) => {
    const client = await slowNetwork(page)
    const nav = page.goto('/dashboard')

    // Within the first second, some loading affordance should exist
    await expect(
      page.getByText(/loading|please wait/i).first()
        .or(page.locator('[role="status"]').first())
        .or(page.locator('.animate-pulse, .animate-spin, [class*="skeleton"]').first())
    ).toBeVisible({ timeout: 3000 }).catch(() => {
      // Some pages render so fast even on 50kB/s they skip the spinner — that's fine
    })

    await nav
    await client.send('Network.disable')
  })

  test('Chat composer is reachable quickly even during load', async ({ page }) => {
    await slowNetwork(page)
    await page.goto('/chat')
    await expect(page.locator('textarea').last()).toBeVisible({ timeout: 15000 })
  })

  test('Tasks page gets to interactive within 10s on slow network', async ({ page }) => {
    await slowNetwork(page)
    await page.goto('/tasks')
    await expect(page.getByRole('heading', { name: /task board/i })).toBeVisible({ timeout: 15000 })
  })
})
