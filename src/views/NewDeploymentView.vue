<script setup lang="ts">
/**
 * The deployment wizard: one shell for both entry points, the current step
 * from the route. The steps hold their own state and calls; this view only
 * wires them to the shell's navigation.
 */
import { computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { ROUTE_NAMES } from '@/router/route-names'
import { useDeploymentWizard } from '@/composables/useDeploymentWizard'
import { useOpenStackCredentialsStore } from '@/stores/openstack-credentials.store'
import CredentialMissingBanner from '@/components/CredentialMissingBanner.vue'
import WizardShell from '@/components/deployment-wizard/WizardShell.vue'
import StepApp from '@/components/deployment-wizard/StepApp.vue'
import StepTarget from '@/components/deployment-wizard/StepTarget.vue'
import StepStart from '@/components/deployment-wizard/StepStart.vue'

const { t } = useI18n()
const credStore = useOpenStackCredentialsStore()
const wizard = useDeploymentWizard()
const { steps, current, index, isLast, blockReason, starting } = wizard

const labels = computed(() => steps.value.map((step) => t(`deployment.wizard.steps.${step}`)))
const backLabel = computed(() => t(index.value === 0 ? 'deployment.wizard.cancel' : 'deployment.actions.back'))
const nextLabel = computed(() => t(isLast.value ? 'deployment.wizard.start' : 'deployment.actions.next'))
const reasonText = computed(() => {
  const reason = blockReason.value
  if (!reason) return null
  return reason.plural === undefined ? t(reason.key, reason.params ?? {}) : t(reason.key, reason.params ?? {}, reason.plural)
})

// The entry points stay disabled without credentials; a deep link still
// lands here, and then the banner explains it instead of a dead wizard.
const credentialsMissing = computed(() => credStore.isResolved && !credStore.hasCredential)

onMounted(() => {
  if (!credStore.status) credStore.fetch()
})
</script>

<template>
  <WizardShell
    :labels="labels"
    :current="index"
    :back-label="backLabel"
    :next-label="nextLabel"
    :block-reason="reasonText"
    :hide-footer="credentialsMissing"
    :busy="starting"
    :busy-label="t('deployment.wizard.starting')"
    @back="wizard.back()"
    @next="wizard.next()"
  >
    <CredentialMissingBanner
      v-if="credentialsMissing"
      variant="warning"
      :title="t('common.missingCreds.title')"
      :message="t('common.missingCreds.text')"
      :cta="t('common.missingCreds.link')"
      :cta-to="{ name: ROUTE_NAMES.userOpenStack }"
      :next="{ name: ROUTE_NAMES.deploymentNew, params: { step: current } }"
    />
    <StepApp v-else-if="current === 'app'" />
    <StepTarget v-else-if="current === 'target'" @change-app="wizard.changeApp()" />
    <StepStart v-else @reason="(reason) => (wizard.stepReason.value = reason)" />
  </WizardShell>
</template>
