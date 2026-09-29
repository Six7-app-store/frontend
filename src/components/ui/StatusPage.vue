<script setup lang="ts">
/**
 * Full-screen frame of the pages that only report a state — the sign-in
 * callbacks and the Moodle (LTI) pages: a narrow centred column, one
 * ``StatusScreen`` per state inside.
 */
</script>

<template>
  <div class="flex flex-col items-center justify-center min-h-screen px-4">
    <div class="max-w-md w-full text-center flex flex-col items-center gap-4">
      <slot />
    </div>
  </div>
</template>
