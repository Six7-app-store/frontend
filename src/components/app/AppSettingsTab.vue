<script setup lang="ts">
/**
 * What the owner or an admin can change about an app: its visibility, its
 * data (name, description, logo) and, last and quiet, deleting it. Every
 * row only asks; the page saves, opens the edit dialog or confirms.
 */
import BaseButton from '@/components/ui/BaseButton.vue'
import ToggleSwitch from '@/components/ui/ToggleSwitch.vue'

defineProps<{
  app: any
  togglingPrivacy: boolean
}>()

defineEmits<{
  togglePrivacy: []
  edit: []
  delete: []
}>()
</script>

<template>
  <div class="flex max-w-content flex-col gap-section">
    <!-- Visibility: on = public. The page flips ``is_private`` once the backend has accepted it. -->
    <section class="surface-panel flex items-center gap-6 p-panel">
      <div class="flex min-w-0 flex-1 flex-col gap-1">
        <h2 class="text-md font-semibold text-heading">{{ $t('AppsDetailView.storePublicTitle') }}</h2>
        <p class="text-base text-fg-muted">
          {{ app.is_private ? $t('AppsDetailView.visibilityPrivateDesc') : $t('AppsDetailView.visibilityPublicDesc') }}
        </p>
      </div>
      <ToggleSwitch
        :model-value="!app.is_private"
        :label="$t('AppsDetailView.storePublicTitle')"
        :disabled="togglingPrivacy"
        @update:model-value="$emit('togglePrivacy')"
      />
    </section>

    <section class="surface-panel flex items-center gap-6 p-panel">
      <div class="flex min-w-0 flex-1 flex-col gap-1">
        <h2 class="text-md font-semibold text-heading">{{ $t('AppsDetailView.settings.editTitle') }}</h2>
        <p class="text-base text-fg-muted">{{ $t('AppsDetailView.editModal.description') }}</p>
      </div>
      <BaseButton variant="secondary" @click="$emit('edit')">{{ $t('AppsDetailView.editApp') }}</BaseButton>
    </section>

    <!-- Deleting sits last and quiet: grey until hovered, confirmed in a dialog. -->
    <section class="flex items-center justify-between gap-6 rounded-panel border border-subtle px-panel py-4">
      <div class="flex min-w-0 flex-col gap-0.5">
        <h2 class="text-base font-semibold text-heading">{{ $t('AppsDetailView.confirmDeleteTitle') }}</h2>
        <p class="text-sm text-fg-muted">{{ $t('AppsDetailView.deleteZoneText', { name: app.name }) }}</p>
      </div>
      <BaseButton variant="danger" @click="$emit('delete')">
        {{ $t('AppsDetailView.deleteZoneButton') }}
      </BaseButton>
    </section>
  </div>
</template>
