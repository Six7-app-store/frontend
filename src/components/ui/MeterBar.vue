<script setup lang="ts">
/**
 * Utilisation bar: green below 50 %, yellow from 50 % (see ``meter.service``).
 * ``label`` names what is measured for screen readers. The width is the one
 * dynamic value, so it is the one inline style.
 */
import { computed } from 'vue'
import { clampPercent, meterLevel, type MeterLevel } from '@/services/meter.service'

const props = defineProps<{
  value: number
  label: string
}>()

const percent = computed(() => clampPercent(props.value))
const level = computed(() => meterLevel(props.value))

// Spelled out, not built from the level: Tailwind only emits classes it finds verbatim.
const FILL_CLASS: Record<MeterLevel, string> = {
  low: 'meter-fill-low',
  mid: 'meter-fill-mid',
}
</script>

<template>
  <div
    class="meter-track"
    role="meter"
    :aria-label="label"
    aria-valuemin="0"
    aria-valuemax="100"
    :aria-valuenow="Math.round(percent)"
  >
    <div class="h-full" :class="FILL_CLASS[level]" :style="{ width: `${percent}%` }" />
  </div>
</template>
