<script setup lang="ts">
/**
 * How the participants work: "Alle zusammen", "Jeder einzeln" or "Gruppen
 * selbst bilden", each with what it leads to. The recommended split carries
 * "Empfohlen für diese App".
 */
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import RadioCardGroup from '@/components/ui/RadioCardGroup.vue'
import type { RadioCardOption } from '@/components/ui/radio-card'
import { RECOMMENDED_MODE, splitResult } from '@/services/team-assignment.service'
import type { GroupMode } from '@/types'

const props = defineProps<{
  mode: GroupMode
  people: number
  /** Number of teams while the split is self-formed. */
  customCount: number
  labelledby: string
}>()

const emit = defineEmits<{ select: [mode: GroupMode] }>()

const { t } = useI18n()

const MODES: GroupMode[] = ['one', 'eachUser', 'custom']

function result(mode: GroupMode): string | undefined {
  const outcome = splitResult(mode, props.people, props.mode === 'custom' ? props.customCount : null)
  return outcome ? t(outcome.key, { n: outcome.n }, outcome.n) : undefined
}

const options = computed<RadioCardOption<GroupMode>[]>(() => MODES.map((mode) => ({
  value: mode,
  label: t(`deployment.wizard.split.${mode}`),
  badge: mode === RECOMMENDED_MODE ? t('deployment.wizard.split.recommended') : undefined,
  description: t(`deployment.wizard.split.${mode}Hint`),
  result: result(mode),
})))

const chosen = computed<GroupMode | null>({
  get: () => props.mode,
  set: (mode) => { if (mode) emit('select', mode) },
})
</script>

<template>
  <RadioCardGroup v-model="chosen" :options="options" :labelledby="labelledby" :columns="3" stacked />
</template>
