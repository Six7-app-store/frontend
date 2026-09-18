import pluginVue from 'eslint-plugin-vue'
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript'

/**
 * Flat ESLint config for the frontend (`npm run lint`).
 *
 * Scope: catch real problems (unused code, broken template syntax, wrong Vue
 * usage). Formatting is deliberately not linted — there is no Prettier in this
 * project, and reformatting the whole code base is not what this gate is for.
 */
export default defineConfigWithVueTs(
  {
    name: 'app/files-to-lint',
    files: ['**/*.{ts,mts,vue}'],
  },
  {
    name: 'app/files-to-ignore',
    ignores: ['dist/**', 'coverage/**', 'public/**', '**/*.d.ts'],
  },
  pluginVue.configs['flat/essential'],
  vueTsConfigs.recommended,
  {
    name: 'app/rules',
    rules: {
      // Single-word component names are the convention here (Card, Badge,
      // Modal, Toast …).
      'vue/multi-word-component-names': 'off',
      // The code base uses `any` in many places (API payloads, wizard state).
      // Removing them is a refactoring of its own, not part of this gate.
      '@typescript-eslint/no-explicit-any': 'off',
      // An underscore marks a parameter that only exists to document the
      // signature (e.g. an unused watcher argument).
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],
    },
  },
)
