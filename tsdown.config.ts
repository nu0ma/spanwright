import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts'],
  outDir: 'dist',
  format: 'esm',
  target: 'node22',
  clean: true,
  sourcemap: false,
  treeshake: true,
  unused: true,
  exports: true,
  onSuccess: 'sort-package-json',
});
