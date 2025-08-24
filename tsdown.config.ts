import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts'],
  outDir: 'dist',
  format: 'esm',
  target: 'node22',
  clean: true,
  sourcemap: false,
  minify: 'dce-only',
  treeshake: true,
  dts: false,
  unbundle: false,
  unused: true,
  define: { 'import.meta.vitest': 'undefined' },
  onSuccess: 'sort-package-json',
});
