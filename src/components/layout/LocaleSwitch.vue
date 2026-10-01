<script setup lang="ts">
/** DE/EN switch; the choice is remembered (see ``useLocale``). */
import { useI18n } from 'vue-i18n'
import { useLocale, type Locale } from '@/composables/useLocale'
import SegmentedControl from '@/components/ui/SegmentedControl.vue'
import type { SegmentOption } from '@/components/ui/segment'

const { t } = useI18n()
const { locale } = useLocale()

const options: SegmentOption<Locale>[] = [
  { value: 'de', label: 'DE' },
  { value: 'en', label: 'EN' },
]
</script>

<template>
  <SegmentedControl v-model="locale" :options="options" :ariaLabel="t('nav.language')" />
</template>
