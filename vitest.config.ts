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
      // wenn die Abdeckung unter diese Werte fällt. Bewusst niedrig
      // angesetzt, damit das Gate beim Einbau nicht sofort rot ist — nach
      // dem ersten echten Coverage-Lauf auf knapp unter den Ist-Wert
      // hochziehen und nie wieder senken.
      thresholds: {
        statements: 30,
        branches: 30,
        functions: 30,
        lines: 30,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
})
