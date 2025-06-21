import { test, expect } from '@playwright/test'

test('has title', async ({ page }) => {
  await page.goto('/')

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/ChainBridge DEX/)
})

test('wallet connection button', async ({ page }) => {
  await page.goto('/')

  // Expect wallet connection button to be visible
  await expect(page.getByRole('button', { name: /connect wallet/i })).toBeVisible()
})
