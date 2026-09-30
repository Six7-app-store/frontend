<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Check } from 'lucide-vue-next'

const props = defineProps<{
  currentStep: number
}>()

const { t } = useI18n()

// 4 steps: config -> assignment -> variables -> summary
const steps = [
  { step: 1, key: 'deployment.steps.config' },
  { step: 2, key: 'deployment.steps.assignment' },
  { step: 3, key: 'deployment.steps.vars' },
  { step: 4, key: 'deployment.steps.summary' }
]

// Compute the fill width automatically from the number of steps.
const progressWidth = computed(() => {
  const totalSteps = steps.length
  // Guard against division by zero if there were only a single step.
  if (totalSteps <= 1) return '0%'
  
  const percentage = ((props.currentStep - 1) / (totalSteps - 1)) * 100
  // Clamp to 0-100% for safety.
  return `${Math.min(Math.max(percentage, 0), 100)}%`
})

// Helper for text alignment.
const getTextAlignmentClass = (step: number, total: number) => {
  if (step === 1) return 'left-0 origin-left'              // first: left-aligned
  if (step === total) return 'right-0 origin-right'        // last: right-aligned
  return 'left-1/2 -translate-x-1/2 origin-center'         // in between: centered
}
</script>

<template>
  <div class="w-full mb-8 px-2"> 
    <div class="relative">
      <div class="meter-track absolute top-1/2 left-0 w-full h-1 -translate-y-1/2"></div>

      <div 
        class="meter-fill-low absolute top-1/2 left-0 h-1 -translate-y-1/2 rounded-tag transition-all duration-500 ease-out"
        :style="{ width: progressWidth }"
      ></div>

      <div class="relative flex justify-between w-full">
        
        <div 
          v-for="item in steps" 
          :key="item.step" 
          class="flex flex-col items-center group relative" 
        >
          <div
            class="step-circle flex items-center justify-center w-8 h-8 rounded-full border-2 text-sm font-semibold z-10 transition-all duration-300"
            :class="[
              currentStep >= item.step ? 'step-reached' : '',
              // Fill the circle once the step is done.
              currentStep > item.step ? 'step-done' : '',
              // Current step: pulse subtly so the user always sees where they are.
              currentStep === item.step ? 'animate-step-pulse' : ''
            ]"
          >
            <Check v-if="currentStep > item.step" :size="16" />
            <span v-else>{{ item.step }}</span>
          </div>

          <span
            class="absolute top-10 text-xs font-semibold transition-colors duration-300 whitespace-nowrap"
            :class="[
              currentStep >= item.step ? 'text-success' : 'text-fg-muted',
              getTextAlignmentClass(item.step, steps.length)
            ]"
          >
            {{ t(item.key) }}
          </span>
        </div>

      </div>
    </div>
    
    <div class="h-6"></div>
  </div>
</template>

<style scoped>
.step-circle {
  background: var(--surface-panel-bg);
  border-color: var(--line-strong);
  color: rgb(var(--color-fg-muted));
}

.step-reached {
  border-color: rgb(var(--color-success-dot));
  color: rgb(var(--color-success));
}

.step-done {
  background: var(--meter-low-bg);
  color: rgb(var(--color-on-accent));
}

/* Scale the circle slightly instead of Tailwind's animate-pulse (which
   modulates opacity and half-hides the current step), so it stays fully visible.
   transform-origin is centered so its position on the line doesn't wobble. */
@keyframes step-pulse {
  0%, 100% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgb(var(--color-success-dot) / 0.25);
  }
  50% {
    transform: scale(1.12);
    box-shadow: 0 0 0 4px rgb(var(--color-success-dot) / 0.15);
  }
}

.animate-step-pulse {
  animation: step-pulse 1.6s ease-in-out infinite;
  transform-origin: center;
}
</style>
