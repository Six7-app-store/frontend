import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  plugins: [vue()],
  test: {
    globals: true,
    environment: 'happy-dom',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary'],
      reportsDirectory: 'coverage',
      include: ['src/**/*.{ts,vue}'],
      exclude: [
        'src/**/*.{test,spec}.ts',
        'src/main.ts',
        'src/**/*.d.ts',
      ],
      // Ratsche gegen Degradation: `vitest --run --coverage` schlägt fehl,
      // wenn die Abdeckung unter diese Werte fällt. Knapp unter dem Ist-Wert
      // vom 29.09.2026 (91 / 86 / 73 / 91 %) — nur anheben, nie senken.
      thresholds: {
        statements: 89,
        branches: 84,
        functions: 71,
        lines: 89,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
})
