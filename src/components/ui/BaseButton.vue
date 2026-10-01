<script setup lang="ts">
/**
 * App-wide primary button.
 *
 * Variants — kept small so all views share the same visual vocabulary:
 *   * ``primary`` / ``yellow`` (default) — main action / create / submit. The
 *                                          red accent button; ``yellow`` is a
 *                                          historical alias kept so call sites
 *                                          needn't change.
 *   * ``green``                          — confirming secondary action (resume,
 *                                          save in a non-destructive context).
 *                                          Neutral glass button — green is a
 *                                          status colour only.
 *   * ``red``                            — destructive action (delete, reject, reset).
 *   * ``ghost``                          — very subtle action (cancel in modals).
 *
 * Disabled: all variants switch to ``opacity-50 + cursor-not-allowed``; the
 * hover styles in components.css skip disabled buttons.
 */
withDefaults(defineProps<{
  variant?: 'primary' | 'yellow' | 'green' | 'red' | 'ghost'
}>(), {
  variant: 'primary',
})
</script>

<template>
  <button
    :class="[
      'inline-flex items-center justify-center gap-2',
      'px-5 py-2.5 rounded-control font-semibold text-sm transition duration-150',
      'disabled:opacity-50 disabled:cursor-not-allowed',
      (variant === 'primary' || variant === 'yellow')
        ? 'btn-primary'
        : variant === 'green'
        ? 'btn-secondary'
        : variant === 'red'
        ? 'btn-danger'
        : variant === 'ghost'
        ? 'btn-ghost'
        : ''
    ]"
  >
    <slot />
  </button>
</template>
