import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node20',
  platform: 'node',
  dts: true,
  sourcemap: true,
  clean: true,
  minify: false,
  splitting: false,
  shims: false,
  bundle: true,
  skipNodeModulesBundle: true,
  external: ['better-sqlite3'],
  esbuildOptions(options) {
    options.banner = {
      js: '#!/usr/bin/env node\n',
    };
  },
});