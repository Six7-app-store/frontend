<script setup lang="ts">
import { ROUTE_NAMES } from '@/router/route-names'
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useDeploymentStore } from '@/stores/deployment.store'
import WizardStepLayout from '@/components/deployment-wizard/WizardStepLayout.vue'
import { BookOpen, UserPlus } from 'lucide-vue-next'
import CoursePickerList from '@/components/deployment-wizard/CoursePickerList.vue'
import SelectedStudentsPanel from '@/components/deployment-wizard/SelectedStudentsPanel.vue'
import StudentSearchList from '@/components/deployment-wizard/StudentSearchList.vue'
import { useToast } from '@/composables/useToast'
import { useCourseStudents } from '@/composables/useCourseStudents'
import { useStudentDirectory } from '@/composables/useStudentDirectory'
import { useUserSearch } from '@/composables/useUserSearch'
import { getErrorDetailMessage } from '@/utils/http-error'
import { useOpenStackCredentialsStore } from '@/stores/openstack-credentials.store'
import CredentialMissingBanner from '@/components/CredentialMissingBanner.vue'
import TabBar from '@/components/ui/TabBar.vue'

const { t } = useI18n()
const router = useRouter()
const store = useDeploymentStore()
const toast = useToast()
const credStore = useOpenStackCredentialsStore()
const directory = useStudentDirectory()
const {
  courses, loadingCounts: loadingCourseStudents, loadCourses, memberIds, memberCount,
  loadCounts, isFullySelected, fullySelectedCourseIds,
} = useCourseStudents()
const {
  query: studentSearchQuery, results: searchResults, error: searchError, loadInitial,
} = useUserSearch({ searchLimit: 50, initialLimit: 1000 })

// Selection tab: 'courses' or 'individuals'.
const activeTab = ref<'courses' | 'individuals'>('courses')

// Every student the search turns up goes into the directory, so the
// selection and the later steps can show their names.
watch(searchResults, (users) => directory.remember(users))

// Search results, each resolved to its directory entry when there is one.
// An empty query lists nobody: students are picked by searching.
//
// Note this searches *Keycloak*, so it finds nobody who exists only here —
// a student provisioned by a Moodle launch has no Keycloak account. Those
// are reachable through their course in the other tab, which reads the
// local member list. Making the search find them too means searching this
// application's own users, which is a separate change.
const filteredStudents = computed(() => {
  if (!studentSearchQuery.value.trim()) return []
  return searchResults.value
    .map((s: any) => (s?.userId && directory.studentOf(s.userId)) || s)
    .filter(Boolean)
})

// Selected students, resolved from the directory (keyed by userId).
const selectedStudents = computed(() =>
  store.draft.studentIds
    .map((id: string) => directory.studentOf(id))
    .filter(Boolean) as any[]
)

const isCourseSelected = (courseId: string) => isFullySelected(courseId, store.draft.studentIds)

// Courses whose students are all selected count as selected courses.
function syncCourseSelection() {
  store.draft.courseIds = fullySelectedCourseIds(store.draft.studentIds)
}

// Course checkbox: select all its students, or deselect them when all are
// selected already.
const toggleCourse = async (courseId: string) => {
  const studentIds = await memberIds(courseId)
  if (studentIds === null) {
    toast.error(t('CourseDetailView.toasts.loadUsersError'))
    return
  }
  if (studentIds.length === 0) {
    toast.warning(t('CourseDetailView.addModal.noUsersFound'))
    return
  }
  if (isCourseSelected(courseId)) {
    store.draft.studentIds = store.draft.studentIds.filter((id: string) => !studentIds.includes(id))
  } else {
    store.draft.studentIds = Array.from(new Set([...store.draft.studentIds, ...studentIds]))
  }
  syncCourseSelection()
}

const toggleStudent = (studentUserId: string) => {
  if (!studentUserId || typeof studentUserId !== 'string' || !studentUserId.trim()) return
  const index = store.draft.studentIds.indexOf(studentUserId)
  if (index > -1) {
    store.draft.studentIds.splice(index, 1)
  } else {
    store.draft.studentIds.push(studentUserId)
  }
  syncCourseSelection()
}

const handleNext = () => {
  // Block if credentials missing — banner already explains why
  if (!credStore.hasCredential) {
    toast.warning(t('AppsDetailView.missingCredsTitle'))
    return
  }
  if (!store.draft.name || store.draft.name.trim() === '') {
    toast.warning(t('deployment.errors.missingName'))
    return
  }
  if (store.draft.studentIds.length === 0) {
    toast.warning(t('deployment.errors.missingStudents'))
    return
  }
  router.push({ name: ROUTE_NAMES.deploymentTeams })
}

const handleBack = () => {
  const appId = store.draft.appId
  if (appId) {
    router.push({ name: ROUTE_NAMES.appsDetail, params: { id: appId } })
  } else {
    router.push({ name: ROUTE_NAMES.apps })
  }
}

// Id of the toast the last failed search produced. Only this one is dismissed
// when the next search runs — ``toast.clear()`` would also drop unrelated
// toasts (e.g. the missing-credentials warning).
let searchErrorToastId: string | null = null
watch(searchError, (err: any) => {
  if (searchErrorToastId !== null) {
    toast.remove(searchErrorToastId)
    searchErrorToastId = null
  }
  if (!err) return
  console.error('User search error:', err)
  searchErrorToastId = toast.error(
    getErrorDetailMessage(err) || err?.message || t('CourseDetailView.toasts.loadUsersError'),
  )
})

onMounted(async () => {
  // Ensure cred state is fresh; banner branch shows when missing
  if (!credStore.status) await credStore.fetch()
  try {
    await loadCourses()
  } catch {
    toast.error(t('CoursesView.toasts.loadError'))
  }
  loadCounts()
  // The initial list is never shown (an empty query lists nobody); it fills
  // the directory so selected students resolve to names.
  try {
    directory.remember(await loadInitial())
  } catch {
    toast.error(t('CourseDetailView.toasts.loadUsersError'))
  }
})
</script>

<template>
  <WizardStepLayout
    :step="1"
    :next-disabled="credStore.isResolved && !credStore.hasCredential"
    @back="handleBack"
    @next="handleNext"
  >

      <CredentialMissingBanner
        v-if="credStore.isResolved && !credStore.hasCredential"
        variant="warning"
        :title="t('AppsDetailView.missingCredsTitle')"
        :message="t('AppsDetailView.missingCredsText')"
        :cta="t('AppsDetailView.missingCredsLink')"
        :ctaTo="{ name: ROUTE_NAMES.userOpenStack }"
        :next="{ name: ROUTE_NAMES.deploymentConfig }"
        class="mb-6"
      />

      <template v-if="!credStore.isResolved || credStore.hasCredential">
      <div class="mb-8">
        <label class="block text-xl font-bold text-fg mb-3">
          {{ t('deployment.config.nameLabel') }}
        </label>
        <input 
          v-model="store.draft.name"
          type="text" 
          :placeholder="t('deployment.config.namePlaceholder')"
          data-testid="deployment-name"
          class="field w-full px-4 py-3 focus:border-accent/60 transition-all"
        />
      </div>

      <div class="flex-grow">
        <h2 class="text-xl font-bold text-fg mb-4">
          {{ t('deployment.config.targetGroupTitle') }}
        </h2>

        <TabBar
          v-model="activeTab"
          :tabs="[
            { key: 'courses', label: t('deployment.config.courseLabel'), icon: BookOpen },
            { key: 'individuals', label: t('deployment.config.studentsLabel'), icon: UserPlus },
          ]"
          class="mb-6"
        />

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          <div>
            <div v-if="activeTab === 'courses'">
              <CoursePickerList
                :courses="courses"
                :loading="loadingCourseStudents"
                :is-selected="isCourseSelected"
                :count-of="memberCount"
                @toggle="toggleCourse" />
            </div>

            <div v-if="activeTab === 'individuals'">
              <StudentSearchList
                v-model:query="studentSearchQuery"
                :students="filteredStudents"
                :selected-ids="store.draft.studentIds"
                @toggle="toggleStudent" />
            </div>
          </div>

          <div>
            <SelectedStudentsPanel :students="selectedStudents" @remove="toggleStudent" />

            <div class="mt-4 p-4 bg-line/[.04] border border-subtle rounded-lg">
              <p class="text-sm text-fg">
                <strong>{{ t('deployment.config.infoTitle') }}</strong> {{ t('deployment.config.infoText') }}
              </p>
            </div>
          </div>

        </div>
      </div>
      </template>

  </WizardStepLayout>
</template>