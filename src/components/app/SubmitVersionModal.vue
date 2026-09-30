<script setup lang="ts">
/** Submitting a version to the store, with optional notes and the marker errors of a rejected attempt. */
import ReasonModal from '@/components/ui/ReasonModal.vue'
import type { AppVariableMarkerError } from '@/types'

defineProps<{
  show: boolean
  versionTag: string | null
  busy: boolean
  markerErrors: AppVariableMarkerError[]
}>()

const notes = defineModel<string>('notes', { required: true })

defineEmits<{ close: []; confirm: [] }>()
</script>

<template>
  <ReasonModal
    v-model="notes"
    :show="show"
    :title="$t('AppsDetailView.submitModal.title')"
    :label="$t('AppsDetailView.submitModal.notesLabel')"
    :placeholder="$t('AppsDetailView.submitModal.notesPlaceholder')"
    :confirm-label="$t('AppsDetailView.submitModal.submit')"
    :busy="busy"
    @close="$emit('close')"
    @confirm="$emit('confirm')"
  >
    <p class="text-sm text-fg-muted">
      {{ $t('AppsDetailView.submitModal.description') }}
      <span class="font-mono bg-line/[.07] px-1.5 py-0.5 rounded text-xs ml-1">{{ versionTag }}</span>
    </p>

    <template #after>
        <!-- Marker-Fehler -->
        <div v-if="markerErrors.length" class="rounded-lg border border-danger-dot/30 bg-danger-dot/10 p-3">
          <p class="text-xs font-semibold text-danger mb-2">{{ $t('AppsDetailView.submitModal.markerErrorTitle') }}</p>
          <ul class="space-y-1.5">
            <li v-for="e in markerErrors" :key="e.variable + e.code" class="text-xs text-danger">
              <span class="font-mono font-medium">{{ e.variable }}</span>
              <span class="text-danger mx-1">·</span>
              <span>{{ e.message }}</span>
              <span v-if="e.location" class="text-danger ml-1 text-xs">({{ e.location }})</span>
            </li>
          </ul>
        </div>
    </template>
  </ReasonModal>
</template>
