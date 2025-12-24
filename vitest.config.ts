/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    // Test environment
    environment: 'jsdom',

    // Test file patterns
    include: ['**/*.{test,spec}.{ts,tsx}'],
    exclude: ['**/node_modules/**', '**/api/**', '**/e2e/**'],

    // Setup files
    setupFiles: ['./src/test/setup.ts'],

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      reportsDirectory: './coverage/frontend',
      include: ['screens/**/*.tsx', 'src/**/*.tsx'],
      exclude: ['**/*.d.ts', '**/test/**'],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
    },

    // Global settings
    globals: true,

    // TypeScript
    typecheck: {
      tsconfig: './tsconfig.json',
    },
  },

  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
