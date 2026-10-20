<script setup lang="ts">
/**
 * Wizard step "Für wen?": the chosen app with "Ändern", the course (or
 * students picked one by one), the deployment name — suggested as
 * "<App> – <Kurs> – <Datum>" until the user types one — and how the people
 * are split. Drag & drop grouping shows only for "Gruppen selbst bilden".
 */
import { computed, onMounted, useId, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import BaseButton from '@/components/ui/BaseButton.vue'
import FormField from '@/components/ui/FormField.vue'
import TargetPicker from '@/components/deployment-wizard/TargetPicker.vue'
import StudentPicker from '@/components/deployment-wizard/StudentPicker.vue'
import SplitModeOptions from '@/components/deployment-wizard/SplitModeOptions.vue'
import TeamBuilder from '@/components/deployment-wizard/TeamBuilder.vue'
import { useDeploymentStore } from '@/stores/deployment.store'
import { useWizardTarget } from '@/composables/useWizardTarget'
import { useTeamAssignment } from '@/composables/useTeamAssignment'
import { useStudentDirectory } from '@/composables/useStudentDirectory'
import { suggestedName } from '@/services/deployment-draft.service'
import { userDisplayName } from '@/utils/user-display'
import { formatDate } from '@/utils/format'

defineEmits<{ 'change-app': [] }>()

const { t } = useI18n()
const store = useDeploymentStore()
const target = useWizardTarget()
const assignment = useTeamAssignment()
const directory = useStudentDirectory()
const splitId = useId()

const nameOf = (id: string) => userDisplayName(directory.studentOf(id), id)

const name = computed({
  get: () => store.draft.name,
  set: (value: string) => {
    store.draft.name = value
    store.draft.nameEdited = true
  },
})

/** What the name says the deployment is for: the course, else the number of students. */
const targetLabel = computed(() => {
  if (target.course.value) return target.course.value.name as string
  const n = store.draft.studentIds.length
  return n > 0 ? t('deployment.wizard.target.picked', { n }, n) : ''
})

watch([targetLabel, () => store.draft.appName], () => {
  if (store.draft.nameEdited) return
  store.draft.name = suggestedName(store.draft.appName, targetLabel.value, formatDate(new Date()))
}, { immediate: true })

onMounted(() => {
  assignment.prepare()
  target.load()
})
</script>

<template>
  <section class="flex flex-col gap-6" data-testid="step-target">
    <div class="surface-panel flex items-center gap-3 px-4 py-3 text-base" data-testid="chosen-app">
      <span class="text-sm text-fg-muted">{{ t('deployment.wizard.target.app') }}</span>
      <span class="font-semibold">{{ store.draft.appName }}</span>
      <span class="font-mono text-sm text-fg-muted">{{ store.draft.releaseTag }}</span>
      <BaseButton variant="secondary" size="sm" class="ml-auto" data-testid="btn-change-app" @click="$emit('change-app')">
        {{ t('deployment.wizard.target.change') }}
      </BaseButton>
    </div>

    <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
      <TargetPicker :target="target" />
      <FormField v-slot="{ id, describedBy }" :label="t('deployment.wizard.target.name')" :hint="t('deployment.wizard.target.nameHint')">
        <input :id="id" v-model="name" type="text" class="field w-full px-3" :aria-describedby="describedBy" data-testid="deployment-name" />
      </FormField>
    </div>

    <StudentPicker v-if="target.individually.value" :target="target" />

    <div class="flex flex-col gap-3">
      <div class="flex flex-col gap-1">
        <h2 :id="splitId" class="text-lg font-semibold text-heading">{{ t('deployment.wizard.split.question') }}</h2>
        <p class="text-sm text-fg-muted">{{ t('deployment.wizard.split.hint') }}</p>
      </div>
      <SplitModeOptions
        :mode="store.draft.groupMode"
        :people="store.draft.studentIds.length"
        :custom-count="store.draft.groupCount"
        :labelledby="splitId"
        @select="assignment.selectMode"
      />
    </div>

    <TeamBuilder v-if="store.draft.groupMode === 'custom'" :assignment="assignment" :name-of="nameOf" />
  </section>
</template>
