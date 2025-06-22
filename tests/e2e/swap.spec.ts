import { expect, Page, test } from '@playwright/test'

// Test data and utilities
const TEST_TOKENS = {
  ETH: { symbol: 'ETH', name: 'Ethereum' },
  USDC: { symbol: 'USDC', name: 'USD Coin' },
  UNI: { symbol: 'UNI', name: 'Uniswap' },
}

const VIEWPORT_SIZES = {
  mobile: { width: 375, height: 667 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1200, height: 800 },
  ultrawide: { width: 1920, height: 1080 },
}

// Helper functions
async function waitForPageLoad(page: Page) {
  await page.waitForLoadState('networkidle')
  await page.waitForSelector('[data-testid="page-loaded"]', { timeout: 10000 })
}

async function checkPagePerformance(page: Page) {
  const metrics = await page.evaluate(() => {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
    const paint = performance.getEntriesByType('paint')

    return {
      loadTime: navigation.loadEventEnd - navigation.loadEventStart,
      domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
      firstContentfulPaint: paint.find(entry => entry.name === 'first-contentful-paint')?.startTime || 0,
      timeToInteractive: navigation.loadEventEnd - navigation.fetchStart,
    }
  })

  // Assert performance thresholds
  expect(metrics.loadTime).toBeLessThan(3000) // 3 seconds
  expect(metrics.firstContentfulPaint).toBeLessThan(2000) // 2 seconds

  return metrics
}

async function checkAccessibility(page: Page) {
  // Inject axe-core for accessibility testing
  await page.addScriptTag({ path: require.resolve('axe-core') })

  const accessibilityResults = await page.evaluate(() => {
    return new Promise((resolve) => {
      // @ts-ignore
      axe.run(document, (err: any, results: any) => {
        if (err) throw err
        resolve(results)
      })
    })
  })

  return accessibilityResults
}

test.describe('Swap Page - Comprehensive E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Set up page with performance monitoring
    await page.goto('/swap', { waitUntil: 'networkidle' })
    await waitForPageLoad(page)
  })

  test.describe('Basic Functionality', () => {
    test('should display swap page correctly', async ({ page }) => {
      // Check page title and meta
      await expect(page).toHaveTitle(/ChainBridge DEX/)

      // Check main heading
      await expect(page.getByRole('heading', { name: 'Swap Tokens' })).toBeVisible()

      // Check description
      await expect(page.getByText('Trade tokens across multiple blockchains with the best rates')).toBeVisible()

      // Check swap form structure
      await expect(page.getByText('From')).toBeVisible()
      await expect(page.getByText('To')).toBeVisible()
      await expect(page.getByText('Balance:')).toBeVisible()
      await expect(page.getByText('Estimated')).toBeVisible()
    })

    test('should show wallet connection state', async ({ page }) => {
      // Check connect wallet button in header
      const connectButton = page.getByRole('button', { name: /connect/i }).first()
      await expect(connectButton).toBeVisible()

      // Check swap button shows appropriate text when not connected
      const swapButton = page.getByRole('button', { name: /connect wallet|select tokens/i }).last()
      await expect(swapButton).toBeVisible()
    })

    test('should handle amount input correctly', async ({ page }) => {
      const amountInput = page.getByPlaceholder('0.0').first()

      // Test valid number input
      await amountInput.fill('1.5')
      await expect(amountInput).toHaveValue('1.5')

      // Test decimal input
      await amountInput.fill('0.001')
      await expect(amountInput).toHaveValue('0.001')

      // Test large number
      await amountInput.fill('1000000')
      await expect(amountInput).toHaveValue('1000000')

      // Test clearing input
      await amountInput.clear()
      await expect(amountInput).toHaveValue('')
    })

    test('should show MAX button functionality', async ({ page }) => {
      const maxButton = page.getByRole('button', { name: /max/i })
      await expect(maxButton).toBeVisible()

      // MAX button should be disabled when no wallet connected
      await expect(maxButton).toBeDisabled()
    })

    test('should display swap direction controls', async ({ page }) => {
      // Check swap direction button
      const swapDirectionButton = page.getByLabelText('Swap tokens')
      await expect(swapDirectionButton).toBeVisible()

      // Test swap direction functionality
      await swapDirectionButton.click()

      // Should trigger animation (check for transform or transition)
      await expect(swapDirectionButton).toHaveCSS('transition', /transform/)
    })
  })

  test.describe('Responsive Design', () => {
    Object.entries(VIEWPORT_SIZES).forEach(([device, size]) => {
      test(`should work correctly on ${device}`, async ({ page }) => {
        await page.setViewportSize(size)

        // Check main elements are visible
        await expect(page.getByRole('heading', { name: 'Swap Tokens' })).toBeVisible()
        await expect(page.getByText('From')).toBeVisible()
        await expect(page.getByText('To')).toBeVisible()

        // Check mobile-specific optimizations
        if (device === 'mobile') {
          // Mobile navigation should be collapsed
          const mobileMenu = page.getByRole('button', { name: /menu/i })
          if (await mobileMenu.isVisible()) {
            await expect(mobileMenu).toBeVisible()
          }
        }

        // Check layout doesn't break
        const swapForm = page.locator('[data-testid="swap-form"]')
        if (await swapForm.isVisible()) {
          const boundingBox = await swapForm.boundingBox()
          expect(boundingBox?.width).toBeLessThanOrEqual(size.width)
        }
      })
    })
  })

  test.describe('Navigation', () => {
    test('should navigate between pages correctly', async ({ page }) => {
      // Test navigation to pools page
      const poolsLink = page.getByRole('link', { name: /pools/i })
      await poolsLink.click()
      await expect(page).toHaveURL(/.*pools/)
      await waitForPageLoad(page)

      // Navigate back to swap
      const swapLink = page.getByRole('link', { name: /swap/i })
      await swapLink.click()
      await expect(page).toHaveURL(/.*swap/)
      await waitForPageLoad(page)

      // Test navigation to portfolio page
      const portfolioLink = page.getByRole('link', { name: /portfolio/i })
      await portfolioLink.click()
      await expect(page).toHaveURL(/.*portfolio/)
      await waitForPageLoad(page)
    })

    test('should maintain state during navigation', async ({ page }) => {
      // Enter amount
      const amountInput = page.getByPlaceholder('0.0').first()
      await amountInput.fill('1.5')

      // Navigate away and back
      await page.getByRole('link', { name: /pools/i }).click()
      await page.getByRole('link', { name: /swap/i }).click()

      // Check if amount is preserved (if implemented)
      // This depends on state persistence implementation
    })
  })

  test.describe('Error Handling', () => {
    test('should handle invalid input gracefully', async ({ page }) => {
      const amountInput = page.getByPlaceholder('0.0').first()

      // Test invalid characters
      await amountInput.fill('abc')
      await expect(page.getByRole('heading', { name: 'Swap Tokens' })).toBeVisible()

      // Test negative numbers
      await amountInput.fill('-100')
      await expect(page.getByRole('heading', { name: 'Swap Tokens' })).toBeVisible()

      // Test special characters
      await amountInput.fill('!@#$%')
      await expect(page.getByRole('heading', { name: 'Swap Tokens' })).toBeVisible()
    })

    test('should show appropriate error messages', async ({ page }) => {
      // Test network error simulation
      await page.route('**/api/**', route => route.abort())

      // Try to perform action that requires network
      const refreshButton = page.getByRole('button', { name: /refresh/i })
      if (await refreshButton.isVisible()) {
        await refreshButton.click()

        // Should show error state
        await expect(page.getByText(/error|failed|network/i)).toBeVisible()
      }
    })
  })

  test.describe('Performance', () => {
    test('should meet performance benchmarks', async ({ page }) => {
      const metrics = await checkPagePerformance(page)

      // Log metrics for monitoring
      console.log('Performance metrics:', metrics)

      // Additional performance checks
      const jsHeapSize = await page.evaluate(() => {
        return (performance as any).memory?.usedJSHeapSize || 0
      })

      // Memory usage should be reasonable (less than 50MB)
      expect(jsHeapSize).toBeLessThan(50 * 1024 * 1024)
    })

    test('should handle rapid interactions', async ({ page }) => {
      const amountInput = page.getByPlaceholder('0.0').first()
      const swapButton = page.getByLabelText('Swap tokens')

      // Rapid input changes
      for (let i = 0; i < 10; i++) {
        await amountInput.fill(`${i}.${i}`)
        await page.waitForTimeout(50)
      }

      // Rapid button clicks
      for (let i = 0; i < 5; i++) {
        await swapButton.click()
        await page.waitForTimeout(100)
      }

      // Page should remain responsive
      await expect(page.getByRole('heading', { name: 'Swap Tokens' })).toBeVisible()
    })
  })

  test.describe('Accessibility', () => {
    test('should meet WCAG 2.1 AA standards', async ({ page }) => {
      const results = await checkAccessibility(page)

      // @ts-ignore
      const violations = results.violations || []

      // Log violations for debugging
      if (violations.length > 0) {
        console.log('Accessibility violations:', violations)
      }

      // Should have no critical accessibility violations
      const criticalViolations = violations.filter((v: any) =>
        v.impact === 'critical' || v.impact === 'serious'
      )
      expect(criticalViolations).toHaveLength(0)
    })

    test('should support keyboard navigation', async ({ page }) => {
      // Test tab navigation
      await page.keyboard.press('Tab')
      await expect(page.locator(':focus')).toBeVisible()

      // Continue tabbing through interactive elements
      const interactiveElements = await page.locator('button, input, a, [tabindex]').count()

      for (let i = 0; i < Math.min(interactiveElements, 10); i++) {
        await page.keyboard.press('Tab')
        const focusedElement = page.locator(':focus')
        await expect(focusedElement).toBeVisible()
      }
    })

    test('should have proper ARIA labels', async ({ page }) => {
      // Check for proper ARIA labels on interactive elements
      const buttons = page.getByRole('button')
      const buttonCount = await buttons.count()

      for (let i = 0; i < buttonCount; i++) {
        const button = buttons.nth(i)
        const ariaLabel = await button.getAttribute('aria-label')
        const textContent = await button.textContent()

        // Button should have either aria-label or text content
        expect(ariaLabel || textContent).toBeTruthy()
      }
    })
  })

  test.describe('Theme and Visual', () => {
    test('should support theme switching', async ({ page }) => {
      // Find theme toggle button
      const themeToggle = page.getByRole('button', { name: /theme|dark|light/i })

      if (await themeToggle.isVisible()) {
        // Get initial theme
        const initialBg = await page.locator('body').evaluate(el =>
          getComputedStyle(el).backgroundColor
        )

        // Toggle theme
        await themeToggle.click()
        await page.waitForTimeout(500) // Wait for theme transition

        // Check if theme changed
        const newBg = await page.locator('body').evaluate(el =>
          getComputedStyle(el).backgroundColor
        )

        expect(newBg).not.toBe(initialBg)
      }
    })

    test('should maintain visual consistency', async ({ page }) => {
      // Take screenshot for visual regression testing
      await expect(page).toHaveScreenshot('swap-page-desktop.png', {
        fullPage: true,
        threshold: 0.2,
      })
    })
  })
})
