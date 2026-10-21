<script setup lang="ts">
/**
 * "Für wen?" — the course select with each course's member count, or, after
 * "einzelne Studierende auswählen", the count of students picked one by one
 * (the search itself is ``StudentPicker``).
 */
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import FormField from '@/components/ui/FormField.vue'
import { useDeploymentStore } from '@/stores/deployment.store'
import type { WizardTarget } from '@/composables/useWizardTarget'

const props = defineProps<{ target: WizardTarget }>()

const { t } = useI18n()
const store = useDeploymentStore()
const { courses, memberCount, coursesState, courseProblem, individually } = props.target

const options = computed(() => courses.value.map((course: any) => {
  const count = memberCount(course.courseId)
  return {
    value: course.courseId as string,
    label: count > 0 ? `${course.name} · ${t('deployment.wizard.target.members', { n: count }, count)}` : course.name,
  }
}))

const chosenCourse = computed({
  get: () => store.draft.courseIds[0] ?? '',
  set: (id: string) => { props.target.chooseCourse(id) },
})

const courseError = computed(() => {
  if (coursesState.value === 'error') return t('deployment.wizard.target.coursesFailed')
  if (courseProblem.value === 'membersFailed') return t('deployment.wizard.target.membersFailed')
  if (courseProblem.value === 'emptyCourse') return t('deployment.wizard.target.emptyCourse')
  return undefined
})

function pickIndividually(on: boolean) {
  individually.value = on
}
</script>

<template>
  <div class="flex flex-col gap-1.5" data-testid="target-picker">
    <template v-if="!individually">
      <FormField v-slot="{ id, describedBy, invalid }" :label="t('deployment.wizard.target.course')" :error="courseError">
        <BaseSelect
          :id="id"
          v-model="chosenCourse"
          :options="options"
          :placeholder="coursesState === 'loading' ? t('deployment.wizard.target.coursesLoading') : t('deployment.wizard.target.coursePlaceholder')"
          :aria-describedby="describedBy"
          :aria-invalid="invalid"
          data-testid="course-select"
        />
      </FormField>
      <p class="text-sm text-fg-muted">
        {{ t('deployment.wizard.target.or') }}
        <button type="button" class="link" data-testid="btn-pick-individually" @click="pickIndividually(true)">
          {{ t('deployment.wizard.target.pickIndividually') }}
        </button>
      </p>
    </template>
    <template v-else>
      <span class="text-sm font-semibold text-fg">{{ t('deployment.wizard.target.students') }}</span>
      <p class="text-base text-fg" data-testid="picked-count">
        {{ t('deployment.wizard.target.picked', { n: store.draft.studentIds.length }, store.draft.studentIds.length) }}
      </p>
      <p class="text-sm text-fg-muted">
        {{ t('deployment.wizard.target.or') }}
        <button type="button" class="link" data-testid="btn-pick-course" @click="pickIndividually(false)">
          {{ t('deployment.wizard.target.pickCourse') }}
        </button>
      </p>
    </template>
  </div>
</template>
