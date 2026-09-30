<script setup lang="ts">
/** Version picker and the button that starts the deployment wizard. */
import { computed } from 'vue'
import { AlertTriangle } from 'lucide-vue-next'
import { ROUTE_NAMES } from '@/router/route-names'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseSelect, { type SelectOption } from '@/components/ui/BaseSelect.vue'
import Card from '@/components/ui/Card.vue'
import FormField from '@/components/ui/FormField.vue'

const props = defineProps<{
  versionOptions: string[]
  /** OpenStack credentials are known to be missing: deploying is blocked. */
  credentialsMissing: boolean
}>()

const selectedVersion = defineModel<string>('selectedVersion', { required: true })

defineEmits<{ deploy: [] }>()

const options = computed<SelectOption[]>(() => props.versionOptions.map((ver) => ({ value: ver, label: ver })))
</script>

<template>
  <Card :title="$t('AppsDetailView.startDeploymentTitle')">
    <div class="flex flex-col gap-4">
      <FormField v-slot="{ id }" :label="$t('AppsDetailView.selectVersionLabel')">
        <BaseSelect
          :id="id"
          v-model="selectedVersion"
          :options="options"
          :placeholder="versionOptions.length === 0 ? $t('AppsDetailView.noVersionsYet') : undefined"
          :disabled="versionOptions.length === 0"
        />
      </FormField>

      <BaseButton
        class="w-full"
        :disabled="!selectedVersion || credentialsMissing"
        :disabled-reason="credentialsMissing ? $t('AppsDetailView.missingCredsTitle') : undefined"
        @click="$emit('deploy')"
      >
        {{ $t('AppsDetailView.deployButton') }}
      </BaseButton>

      <p v-if="credentialsMissing" class="flex gap-2 text-sm text-fg-body">
        <AlertTriangle :size="15" class="mt-0.5 shrink-0 text-warning-dot" aria-hidden="true" />
        <span>
          <RouterLink :to="{ name: ROUTE_NAMES.userOpenStack }" class="link">{{ $t('AppsDetailView.missingCredsLink') }}</RouterLink>
          {{ $t('AppsDetailView.missingCredsText') }}
        </span>
      </p>
    </div>
  </Card>
</template>
