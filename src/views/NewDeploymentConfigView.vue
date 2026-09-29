<script setup lang="ts">
import { ROUTE_NAMES } from '@/router/route-names'
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useDeploymentStore } from '@/stores/deployment.store'
import DeploymentProgressBar from '@/components/DeploymentProgressBar.vue'
import { 
  BarChart3, 
  Search,
  Check,
  Users,
  BookOpen,
  UserPlus
} from 'lucide-vue-next'
import { useToast } from '@/composables/useToast'
import { useCourseStudents } from '@/composables/useCourseStudents'
import { useStudentDirectory } from '@/composables/useStudentDirectory'
import { useUserSearch } from '@/composables/useUserSearch'
import { getErrorDetailMessage } from '@/utils/http-error'
import { useOpenStackCredentialsStore } from '@/stores/openstack-credentials.store'
import { userDisplayName } from '@/utils/user-display'
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
  <div class="max-w-6xl mx-auto w-full">
    
    <div class="bg-panel rounded-2xl p-10 border shadow-sm min-h-[700px] flex flex-col">
      
      <div class="flex items-center gap-3 mb-6">
        <h1 class="text-3xl font-bold text-fg">
          {{ t('deployment.title') }}
        </h1>
        <BarChart3 :size="32" class="text-icon" />
      </div>

      <DeploymentProgressBar :current-step="1" />

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
              <h3 class="text-lg font-semibold text-fg mb-4">{{ t('CoursesView.title') }}</h3>
              <div class="space-y-3 max-h-[400px] overflow-y-auto">
                <div 
                  v-for="course in courses"
                  :key="course.courseId"
                  @click="toggleCourse(course.courseId)"
                  :data-testid="`course-${course.courseId}`"
                  class="flex items-center gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all"
                  :class="isCourseSelected(course.courseId) 
                    ? 'bg-line/[.07] border-strong' 
                    : 'bg-line/[.04] border-subtle hover:border-strong'"
                >
                  <div class="w-6 h-6 flex items-center justify-center rounded border transition-colors"
                       :class="isCourseSelected(course.courseId) ? 'bg-accent border-accent' : 'border-strong bg-panel'"
                  >
                     <Check v-if="isCourseSelected(course.courseId)" :size="16" class="text-on-accent" />
                  </div>
                  <div class="flex-grow">
                    <div class="font-semibold text-fg">{{ course.name }}</div>
                    <div class="text-sm text-fg-muted">
                      <span v-if="loadingCourseStudents.has(course.courseId)">{{ t('CoursesView.loading') }}</span>
                      <span v-else>{{ t('DeploymentDetailView.deploymentStudentCount', memberCount(course.courseId)) }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="activeTab === 'individuals'">
              <h3 class="text-lg font-semibold text-fg mb-4">{{ t('deployment.config.studentsLabel') }}</h3>
              
              <div class="relative mb-4">
                <Search class="absolute left-4 top-1/2 transform -translate-y-1/2 text-icon" :size="20" />
                <input 
                  v-model="studentSearchQuery"
                  type="text"
                  :placeholder="t('deployment.config.searchPlaceholder')"
                  data-testid="student-search"
                  class="field w-full pl-12 pr-4 py-3 focus:border-accent/60 transition-all"
                />
              </div>

              <div class="bg-line/[.04] rounded-lg overflow-hidden border-2 border-subtle max-h-[350px] overflow-y-auto">
                <div 
                  v-for="student in filteredStudents"
                  :key="student.userId"
                  @click="toggleStudent(student.userId)"
                  :data-testid="`student-${student.userId}`"
                  class="flex items-center gap-3 px-4 py-3 cursor-pointer border-b last:border-b-0 border-subtle transition-colors select-none"
                  :class="store.draft.studentIds.includes(student.userId) ? 'bg-line/[.07]' : 'hover:bg-line/[.07]'"
                >
                  <div class="w-6 h-6 flex items-center justify-center rounded border transition-colors"
                       :class="store.draft.studentIds.includes(student.userId) ? 'bg-accent border-accent' : 'border-strong bg-panel'"
                  >
                     <Check v-if="store.draft.studentIds.includes(student.userId)" :size="16" class="text-on-accent" />
                  </div>
                  <span class="text-fg font-medium">
                    {{ userDisplayName(student, student.userId) }}
                  </span>
                </div>
                
                <div v-if="filteredStudents.length === 0" class="p-4 text-fg-muted text-center">
                  {{ t('CourseDetailView.addModal.noUsersFound') }}
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 class="text-lg font-semibold text-fg mb-4 flex items-center gap-2">
              <Users :size="20" />
              {{ t('deployment.groups.studentsSelected', { count: selectedStudents.length }) }}
            </h3>
            
            <div class="bg-line/[.04] rounded-lg border-2 border-subtle p-4 max-h-[400px] overflow-y-auto">
              <div v-if="selectedStudents.length === 0" class="text-fg-muted text-center py-8">
                {{ t('deployment.assignment.noStudents') }}
              </div>
              <div v-else class="space-y-2">
                <div
                  v-for="student in selectedStudents"
                  :key="student.userId"
                  class="flex items-center justify-between bg-panel p-3 rounded-lg border border-subtle"
                >
                  <span class="text-fg font-medium">
                    {{ userDisplayName(student, student.userId) }}
                  </span>
                  <button 
                    @click="toggleStudent(student.userId)" 
                    class="text-danger hover:text-danger font-bold text-lg leading-none"
                    :title="t('CourseDetailView.removeModal.remove')"
                    :data-testid="`remove-${student.userId}`"
                  >
                    ×
                  </button>
                </div>
              </div>
            </div>

            <div class="mt-4 p-4 bg-line/[.04] border border-subtle rounded-lg">
              <p class="text-sm text-fg">
                <strong>{{ t('deployment.config.infoTitle') }}</strong> {{ t('deployment.config.infoText') }}
              </p>
            </div>
          </div>

        </div>
      </div>
      </template>

      <div class="flex justify-between items-center mt-8 pt-4 border-t border-subtle">
        <button 
          @click="handleBack"
          data-testid="btn-back"
          class="btn-secondary px-8 py-2.5 rounded-control font-semibold transition"
        >
          {{ t('deployment.actions.back') }}
        </button>
        
        <button
          @click="handleNext"
          data-testid="btn-next"
          :disabled="credStore.isResolved && !credStore.hasCredential"
          class="btn-primary px-8 py-2.5 rounded-control font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {{ t('deployment.actions.next') }}
        </button>
      </div>

    </div>
  </div>
</template>