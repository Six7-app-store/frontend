<script setup lang="ts">
/** Wizard step "app" — filled in by its own stage. */
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<template>
  <section class="flex flex-col gap-4" data-testid="step-app">
    <h2 class="text-xl font-semibold text-heading">{{ t('deployment.wizard.steps.app') }}</h2>
  </section>
</template>
