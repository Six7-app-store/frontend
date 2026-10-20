<script setup lang="ts">
/** Wizard step "target" — filled in by its own stage. */
import { useI18n } from 'vue-i18n'

defineEmits<{ 'change-app': [] }>()

const { t } = useI18n()
</script>

<template>
  <section class="flex flex-col gap-4" data-testid="step-target">
    <h2 class="text-xl font-semibold text-heading">{{ t('deployment.wizard.steps.target') }}</h2>
  </section>
</template>
