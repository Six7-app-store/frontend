<script setup lang="ts">
/**
 * Frame of the pages that only report a state — the sign-in callbacks and
 * the Moodle (LTI) pages — inside the auth layout's panel: one
 * ``StatusScreen`` per state.
 */
</script>

<template>
  <div class="flex w-full flex-col gap-6">
    <slot />
  </div>
</template>
