<script setup lang="ts">
/** The three group modes of the team-assignment step as a segmented control. */
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import SegmentedControl from '@/components/ui/SegmentedControl.vue'
import type { SegmentOption } from '@/components/ui/segment'
import type { GroupMode } from '@/types'

const props = defineProps<{ mode: GroupMode }>()
const emit = defineEmits<{ select: [mode: GroupMode] }>()

const { t } = useI18n()
const modes: GroupMode[] = ['one', 'eachUser', 'custom']

const options = computed<SegmentOption<GroupMode>[]>(() => modes.map((m) => ({ value: m, label: t(`deployment.groups.${m}`) })))

const selected = computed<GroupMode>({
  get: () => props.mode,
  set: (m) => emit('select', m),
})
</script>

<template>
  <SegmentedControl v-model="selected" size="md" :options="options" :ariaLabel="t('deployment.groups.label')" />
</template>
