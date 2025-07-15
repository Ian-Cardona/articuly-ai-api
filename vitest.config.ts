import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: [
      '__tests__/**/*.{test,spec}.{ts,js,mts}',
      'src/**/*.{test,spec}.{ts,js,mts}',
      'tests-dist/**/*.{test,spec}.{ts,js,mts}'
    ],
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'html'],
      reportsDirectory: './coverage',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.d.ts'],
    },
    setupFiles: [],
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
}); 