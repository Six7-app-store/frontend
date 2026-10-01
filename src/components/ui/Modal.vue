<!-- src/components/ui/Modal.vue -->
<script setup lang="ts">
defineProps<{ show: boolean }>()
defineEmits(['close'])
</script>

<template>
  <div
    v-if="show"
    class="scrim fixed inset-0 flex items-center justify-center z-50 p-4"
    @click.self="$emit('close')"
  >
    <div
      class="surface-overlay w-full max-w-[520px] animate-fade-in flex flex-col max-h-[90vh]"
      @click.stop
    >
      <!-- Header -->
      <div class="flex justify-between items-center px-6 py-4 border-b">
        <div class="text-lg font-semibold text-fg leading-tight pr-4">
          <!--
            Two slot names accepted:
              * ``#header`` — used by CoursesView, CourseDetailView.
              * ``#title``  — alias used by DeploymentDetailView, AppsDetailView.
            Either slot wins; both empty falls back to "Modal".
          -->
          <slot name="header">
            <slot name="title">Modal</slot>
          </slot>
        </div>
        <button
          @click="$emit('close')"
          class="btn-ghost p-2 -mr-1 rounded-control transition-colors flex-shrink-0"
          aria-label="Close"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <!-- Body -->
      <div class="px-6 py-5 overflow-y-auto flex-grow">
        <slot name="body">
          <slot></slot>
        </slot>
      </div>

      <!-- Footer -->
      <div
        v-if="$slots.footer"
        class="modal-footer px-6 py-4 border-t"
      >
        <slot name="footer"></slot>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes fade-in {
  from { 
    opacity: 0; 
    transform: scale(0.95); 
  }
  to { 
    opacity: 1; 
    transform: scale(1); 
  }
}

.animate-fade-in {
  animation: fade-in 0.2s ease-out;
}

.modal-footer {
  background: var(--surface-sunken-bg);
  border-radius: 0 0 8px 8px;
}
</style>
