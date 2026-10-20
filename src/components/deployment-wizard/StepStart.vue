<script setup lang="ts">
/** Wizard step "start" — filled in by its own stage. */
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<template>
  <section class="flex flex-col gap-4" data-testid="step-start">
    <h2 class="text-xl font-semibold text-heading">{{ t('deployment.wizard.steps.start') }}</h2>
  </section>
</template>
