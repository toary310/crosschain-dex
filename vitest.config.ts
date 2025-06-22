/// <reference types="vitest" />
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
    css: true,
    // Fix for Vite CJS deprecation warning
    pool: 'forks',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/coverage/**',
        '**/dist/**',
        '**/.next/**',
        '**/public/**',
        '**/*.stories.*',
        '**/*.test.*',
        '**/*.spec.*',
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
        // Critical components should have higher coverage
        'src/components/Swap/': {
          branches: 90,
          functions: 90,
          lines: 90,
          statements: 90,
        },
        'src/services/': {
          branches: 85,
          functions: 85,
          lines: 85,
          statements: 85,
        },
      },
      all: true,
      include: ['src/**/*.{ts,tsx}'],
      reportOnFailure: true,
    },
    // Performance testing
    benchmark: {
      include: ['**/*.bench.{ts,tsx}'],
      exclude: ['node_modules'],
    },
    // Test timeout configuration
    testTimeout: 10000,
    hookTimeout: 10000,
    // Parallel execution (using forks for better compatibility)
    poolOptions: {
      forks: {
        singleFork: false,
        maxForks: 4,
        minForks: 1,
      },
    },
    // Reporter configuration
    reporters: process.env.CI
      ? ['verbose', 'junit', 'json']
      : ['verbose', 'html'],
    outputFile: {
      junit: './test-results/junit.xml',
      json: './test-results/results.json',
      html: './test-results/index.html',
    },
    // Watch mode configuration
    watch: !process.env.CI,
    watchExclude: ['**/node_modules/**', '**/dist/**'],
    // Disable UI
    ui: false,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
})
