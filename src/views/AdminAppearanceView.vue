<script setup lang="ts">
/**
 * Verwaltung → Darstellung: the three logos and the accent colour of the
 * instance. A logo is saved as soon as it is chosen; an accent is previewed
 * on the whole app while it is edited and saved on request.
 */
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { RotateCcw, Upload } from 'lucide-vue-next'
import PageHeader from '@/components/ui/PageHeader.vue'
import Card from '@/components/ui/Card.vue'
import Badge from '@/components/ui/Badge.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import FormField from '@/components/ui/FormField.vue'
import ToggleSwitch from '@/components/ui/ToggleSwitch.vue'
import { useAppearanceSettings } from '@/composables/useAppearanceSettings'
import { useBranding } from '@/composables/useBranding'
import { useToast } from '@/composables/useToast'
import { useUiSettingsStore } from '@/stores/ui-settings.store'
import { MAX_IMAGE_MB } from '@/utils/file'
import type { LogoVariant } from '@/types/ui-settings'

const { t } = useI18n()
const toast = useToast()
const store = useUiSettingsStore()
const { logoLight, logoDark, logoIcon } = useBranding()
const {
  draft, normalizedDraft, isDraftValid, isDirty, hasCustomAccent,
  saveAccent, resetAccent, discardAccent, busyLogo, uploadLogo, resetLogo,
} = useAppearanceSettings()

// Each logo is shown on the background it is made for; the small version
// on the light one, like a browser tab.
const logoTiles = [
  { variant: 'light', src: logoLight, preview: 'logo-preview-light', imgClass: 'h-10 max-w-full' },
  { variant: 'dark', src: logoDark, preview: 'logo-preview-dark', imgClass: 'h-10 max-w-full' },
  { variant: 'icon', src: logoIcon, preview: 'logo-preview-light', imgClass: 'h-12 w-12' },
] as const

const fileInputs = ref<Partial<Record<LogoVariant, HTMLInputElement | null>>>({})
const savingAccent = ref(false)
const sampleToggle = ref(true)

const onLogoChosen = async (variant: LogoVariant, event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  // Clear it so choosing the same file again still fires ``change``.
  input.value = ''
  if (!file) return
  try {
    const problem = await uploadLogo(variant, file)
    if (problem === 'not_image') toast.error(t('image.onlyImages'))
    else if (problem === 'too_large') toast.error(t('image.tooLarge', { size: MAX_IMAGE_MB }))
    else toast.success(t('AdminAppearanceView.logos.uploadSuccess'))
  } catch {
    toast.error(t('AdminAppearanceView.logos.uploadError'))
  }
}

const onLogoReset = async (variant: LogoVariant) => {
  try {
    await resetLogo(variant)
    toast.success(t('AdminAppearanceView.logos.resetSuccess'))
  } catch {
    toast.error(t('AdminAppearanceView.logos.resetError'))
  }
}

const runAccent = async (action: () => Promise<void>, successKey: string) => {
  savingAccent.value = true
  try {
    await action()
    toast.success(t(successKey))
  } catch {
    toast.error(t('AdminAppearanceView.accent.saveError'))
  } finally {
    savingAccent.value = false
  }
}

const onSaveAccent = () => runAccent(saveAccent, 'AdminAppearanceView.accent.saveSuccess')
const onResetAccent = () => runAccent(resetAccent, 'AdminAppearanceView.accent.resetSuccess')

// The native picker only speaks lowercase ``#rrggbb``.
const pickerValue = () => normalizedDraft.value?.toLowerCase() ?? ''
const onPick = (event: Event) => {
  draft.value = (event.target as HTMLInputElement).value.toUpperCase()
}
</script>

<template>
  <div class="max-w-page">
    <PageHeader :title="t('AdminAppearanceView.title')" :subtitle="t('AdminAppearanceView.subtitle')" />

    <div class="flex max-w-content flex-col gap-section">
      <Card :title="t('AdminAppearanceView.logos.title')">
        <p class="mb-4 text-sm text-fg-muted">{{ t('AdminAppearanceView.logos.hint', { size: MAX_IMAGE_MB }) }}</p>
        <ul class="grid gap-card sm:grid-cols-3">
          <li
            v-for="tile in logoTiles"
            :key="tile.variant"
            class="flex flex-col gap-3"
            :data-test="`logo-${tile.variant}`"
          >
            <div
              class="flex h-24 items-center justify-center rounded-control border border-subtle px-4"
              :class="tile.preview"
            >
              <img :src="tile.src.value" alt="" class="object-contain" :class="tile.imgClass" />
            </div>
            <div class="flex flex-col gap-1">
              <div class="flex items-center justify-between gap-2">
                <h3 class="text-base font-semibold text-heading">{{ t(`AdminAppearanceView.logos.${tile.variant}`) }}</h3>
                <Badge :tone="store.settings.logos[tile.variant] ? 'info' : 'neutral'">
                  {{ store.settings.logos[tile.variant] ? t('AdminAppearanceView.logos.custom') : t('AdminAppearanceView.logos.default') }}
                </Badge>
              </div>
              <p class="text-sm text-fg-muted">{{ t(`AdminAppearanceView.logos.${tile.variant}Desc`) }}</p>
            </div>
            <div class="mt-auto flex flex-wrap gap-2">
              <input
                :ref="(el) => (fileInputs[tile.variant] = el as HTMLInputElement | null)"
                type="file"
                accept="image/*"
                class="hidden"
                @change="onLogoChosen(tile.variant, $event)"
              />
              <BaseButton
                variant="secondary"
                size="sm"
                :disabled="busyLogo !== null"
                @click="fileInputs[tile.variant]?.click()"
              >
                <Upload :size="14" aria-hidden="true" />
                {{ store.settings.logos[tile.variant] ? t('AdminAppearanceView.logos.replace') : t('AdminAppearanceView.logos.upload') }}
              </BaseButton>
              <BaseButton
                v-if="store.settings.logos[tile.variant]"
                variant="ghost"
                size="sm"
                :disabled="busyLogo !== null"
                @click="onLogoReset(tile.variant)"
              >
                <RotateCcw :size="14" aria-hidden="true" />
                {{ t('AdminAppearanceView.logos.reset') }}
              </BaseButton>
            </div>
          </li>
        </ul>
      </Card>

      <Card :title="t('AdminAppearanceView.accent.title')">
        <template #actions>
          <Badge :tone="hasCustomAccent ? 'info' : 'neutral'">
            {{ hasCustomAccent ? t('AdminAppearanceView.accent.custom') : t('AdminAppearanceView.accent.default') }}
          </Badge>
        </template>

        <p class="mb-4 text-sm text-fg-muted">{{ t('AdminAppearanceView.accent.hint') }}</p>

        <div class="flex flex-wrap items-start gap-6">
          <FormField
            :label="t('AdminAppearanceView.accent.label')"
            :error="isDraftValid ? undefined : t('AdminAppearanceView.accent.invalid')"
            class="w-56"
            v-slot="{ id, describedBy, invalid }"
          >
            <div class="flex items-center gap-2">
              <input
                type="color"
                :value="pickerValue()"
                :aria-label="t('AdminAppearanceView.accent.picker')"
                class="h-control w-12 shrink-0 cursor-pointer rounded-control border border-strong bg-transparent p-1"
                @input="onPick"
              />
              <BaseInput
                :id="id"
                v-model="draft"
                class="font-mono"
                maxlength="7"
                spellcheck="false"
                :aria-describedby="describedBy"
                :aria-invalid="invalid"
                data-test="accent-input"
              />
            </div>
          </FormField>

          <!-- What the accent touches, live with the preview. -->
          <div class="flex flex-wrap items-center gap-4 pt-6" aria-hidden="true">
            <BaseButton tabindex="-1">{{ t('AdminAppearanceView.accent.sampleButton') }}</BaseButton>
            <ToggleSwitch v-model="sampleToggle" :label="t('AdminAppearanceView.accent.sampleToggle')" tabindex="-1" />
            <span class="text-base font-semibold text-accent-fg">{{ t('AdminAppearanceView.accent.sampleLink') }}</span>
          </div>
        </div>

        <p v-if="isDirty" class="mt-4 text-sm text-fg-muted" role="status">
          {{ t('AdminAppearanceView.accent.previewNote') }}
        </p>

        <div class="mt-5 flex flex-wrap items-center gap-2">
          <BaseButton :disabled="!isDirty || savingAccent" data-test="accent-save" @click="onSaveAccent">
            {{ t('AdminAppearanceView.accent.save') }}
          </BaseButton>
          <BaseButton v-if="isDirty" variant="ghost" :disabled="savingAccent" @click="discardAccent">
            {{ t('AdminAppearanceView.accent.discard') }}
          </BaseButton>
          <BaseButton
            v-if="hasCustomAccent"
            variant="secondary"
            class="ml-auto"
            :disabled="savingAccent"
            data-test="accent-reset"
            @click="onResetAccent"
          >
            <RotateCcw :size="14" aria-hidden="true" />
            {{ t('AdminAppearanceView.accent.reset') }}
          </BaseButton>
        </div>
      </Card>
    </div>
  </div>
</template>
