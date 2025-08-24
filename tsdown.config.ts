import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts', 'e2e/setup-e2e-test-schemas.ts'],
  outDir: 'dist',
  format: ['esm'],
  target: 'node20',
  clean: true,
  sourcemap: true,
  unbundle: true // Keep as separate files for better debugging
})