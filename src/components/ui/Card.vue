<script setup lang="ts">
/**
 * The panel every page section sits in. With a ``title`` (or the ``header``
 * slot) it gets a header row, the ``actions`` slot puts buttons on its right.
 * ``flush`` drops the body padding for content that brings its own, such as
 * a ``DataTable``.
 */
withDefaults(defineProps<{
  title?: string
  flush?: boolean
}>(), {
  flush: false,
})
</script>

<template>
  <section class="surface-panel">
    <header v-if="title || $slots.header || $slots.actions" class="panel-head">
      <slot name="header">
        <h2 class="min-w-0 truncate text-md font-semibold text-heading">{{ title }}</h2>
      </slot>
      <div v-if="$slots.actions" class="flex shrink-0 items-center gap-2">
        <slot name="actions" />
      </div>
    </header>
    <div :class="flush ? '' : 'p-panel'">
      <slot />
    </div>
  </section>
</template>
