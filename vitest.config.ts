import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        'template/',
        'scripts/',
        'src/__tests__/',
        'src/__mocks__/',
        '*.config.ts',
        '*.config.js'
      ],
      thresholds: {
        statements: 85,
        branches: 90,
        functions: 95,
        lines: 85
      }
    },
    include: ['src/**/*.{test,spec}.{js,ts}'],
    exclude: ['node_modules', 'dist', 'template']
  }
})