import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/scripts/setup.ts'],
  format: ['esm'],
  target: 'node20',
  platform: 'node',
  dts: false, // Skip type checking for now
  sourcemap: true,
  clean: true,
  minify: process.env.NODE_ENV === 'production',
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