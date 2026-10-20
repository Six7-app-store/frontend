<script setup lang="ts">
/** Picking students one by one: the search with a checkbox per hit, and who is picked so far. */
import { watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { AlertCircle } from 'lucide-vue-next'
import StudentSearchList from '@/components/deployment-wizard/StudentSearchList.vue'
import SelectedStudentsPanel from '@/components/deployment-wizard/SelectedStudentsPanel.vue'
import { useDeploymentStore } from '@/stores/deployment.store'
import { getErrorDetailMessage } from '@/utils/http-error'
import type { WizardTarget } from '@/composables/useWizardTarget'

const props = defineProps<{ target: WizardTarget }>()

const { t } = useI18n()
const store = useDeploymentStore()
const { query, hits, selected, searchError, toggleStudent } = props.target

watch(searchError, (err) => { if (err) console.error('User search error:', err) })
</script>

<template>
  <div class="grid grid-cols-1 gap-6 lg:grid-cols-2" data-testid="student-picker">
    <div class="flex flex-col gap-2">
      <StudentSearchList
        v-model:query="query"
        :students="hits"
        :selected-ids="store.draft.studentIds"
        @toggle="toggleStudent"
      />
      <p v-if="searchError" class="flex items-center gap-1.5 text-sm text-danger" role="alert">
        <AlertCircle :size="15" class="shrink-0" aria-hidden="true" />
        {{ getErrorDetailMessage(searchError) || t('common.loadUsersError') }}
      </p>
    </div>
    <SelectedStudentsPanel :students="selected" @remove="toggleStudent" />
  </div>
</template>
