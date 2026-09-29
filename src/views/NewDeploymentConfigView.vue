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
import { courseApi } from '@/api/course.api'
import { userApi } from '@/api/user.api'
import { useToast } from '@/composables/useToast'
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

const courses = ref<any[]>([])

// Two separate lists: cache (initial) + current view (search/filter).
const allStudents = ref<any[]>([])
const students = ref<any[]>([])

// Cache map for every student ever seen, keyed by ``userId``.
//
// Deliberately not ``keycloak_id``: a student who arrives through a Moodle
// LTI launch never passes Keycloak, so that column stays NULL for them. Key
// on it and the whole wizard drops them silently — the course still reports
// its member count, but the picker beside it stays empty, which reads like a
// loading bug rather than a filter. ``userId`` is this application's own
// primary key and is there for everybody, whichever way they signed in.
const studentCache = ref(new Map<string, any>())

const studentSearchQuery = ref('')
const loadingCourses = ref(false)
const loadingStudents = ref(false)
const coursesError = ref<string | null>(null)
const studentsError = ref<string | null>(null)

// Selection tab: 'courses' or 'individuals'.
const activeTab = ref<'courses' | 'individuals'>('courses')

// Helper: store students in the cache (keyed by userId). Only overwrite
// when the new object has more info (e.g. firstName).
function cacheStudents(list: any[]) {
  for (const s of list || []) {
    if (!s?.userId || typeof s.userId !== 'string' || !s.userId.trim()) continue
    const existing = studentCache.value.get(s.userId)
    if (!existing || (s.firstName && !existing.firstName) || (s.lastName && !existing.lastName)) {
      studentCache.value.set(s.userId, s)
      store.studentCache.set(s.userId, s)
    }
  }
}

// Filtered list for individual search: shows search results, always returning
// the cached object when present.
const filteredStudents = computed(() => {
  // Base: empty query → empty list (no students without a search).
  if (!studentSearchQuery.value.trim()) {
    return []
  }
  // The backend already filtered by username/email/firstName/lastName (Keycloak
  // Admin API ``/users?search=…``), so we pass its response through and only use
  // the cached object when present (prevents duplicates).
  //
  // Note this searches *Keycloak*, so it finds nobody who exists only here —
  // a student provisioned by a Moodle launch has no Keycloak account. Those
  // are reachable through their course in the other tab, which reads the
  // local member list. Making the search find them too means searching this
  // application's own users, which is a separate change.
  return students.value.map((s: any) => {
    const cached = s?.userId ? studentCache.value.get(s.userId) : undefined
    return cached || s
  }).filter(Boolean)
})

// Selected students: always resolved from the cache (stable, keyed by userId).
const selectedStudents = computed(() => {
  return store.draft.studentIds
    .map((kid: string) => studentCache.value.get(kid))
    .filter(Boolean)
})

// Cache for students per course (lazy loading).
const courseStudentsCache = ref(new Map<string, any[]>())

// Helper: return all student IDs of a course (lazy loading). Returns ``null``
// when the list could not be loaded, so callers can tell a failed request from
// a course without students.
async function getStudentIdsForCourse(courseId: string): Promise<string[] | null> {
  // Check the cache.
  if (courseStudentsCache.value.has(courseId)) {
    const students = courseStudentsCache.value.get(courseId)!
    return students.map((s: any) => s.userId)
  }

  // Load students for this course.
  try {
    const res = await courseApi.getById(courseId)
    const students = res.data.users || []
    courseStudentsCache.value.set(courseId, students)
    // Also cache in studentCache.
    cacheStudents(students)
    return students.map((s: any) => s.userId)
  } catch (err) {
    // Deliberately silent here: the caller decides what to show (the count
    // stays at 0, a click reports the failed load).
    console.error(`Failed to load students for course ${courseId}:`, err)
    return null
  }
}

// Loading states for courses.
const loadingCourseStudents = ref(new Set<string>())

// At most this many course member lists are fetched at the same time. The
// course list can hold up to 200 entries, and firing all of them at once
// hammers the backend.
const MAX_PARALLEL_COURSE_LOADS = 5

// Helper: return the student count per course (read-only; the lists are
// loaded by ``loadCourseStudentCounts`` after the course list arrives).
function getStudentCountForCourse(courseId: string) {
  return courseStudentsCache.value.get(courseId)?.length ?? 0
}

// Load the member list of every course that isn't cached yet, at most
// ``MAX_PARALLEL_COURSE_LOADS`` at a time. Called once after the courses are
// there — never from the render, which used to start one request per
// rendered course.
async function loadCourseStudentCounts() {
  const queue = courses.value
    .map((course: any) => course.courseId as string)
    .filter((courseId) => courseId && !courseStudentsCache.value.has(courseId))
  queue.forEach((courseId) => loadingCourseStudents.value.add(courseId))

  const worker = async () => {
    while (queue.length > 0) {
      const courseId = queue.shift()!
      // ``getStudentIdsForCourse`` handles its own errors; the marker is
      // cleared either way.
      await getStudentIdsForCourse(courseId)
      loadingCourseStudents.value.delete(courseId)
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(MAX_PARALLEL_COURSE_LOADS, queue.length) }, worker)
  )
}

// Course checkbox: checked when all students of the course are selected.
function isCourseSelected(courseId: string) {
  if (!courseStudentsCache.value.has(courseId)) {
    return false // not loaded yet
  }
  const studentIds = courseStudentsCache.value.get(courseId)!.map((s: any) => s.userId)
  return studentIds.length > 0 && studentIds.every((id) => store.draft.studentIds.includes(id))
}

// Course checkbox toggle: select/deselect all students of the course.
const toggleCourse = async (courseId: string) => {
  const studentIds = await getStudentIdsForCourse(courseId)
  if (studentIds === null) {
    toast.error(t('CourseDetailView.toasts.loadUsersError'))
    return
  }
  if (studentIds.length === 0) {
    toast.warning(t('CourseDetailView.addModal.noUsersFound'))
    return
  }
  const allSelected = studentIds.length > 0 && studentIds.every((id) => store.draft.studentIds.includes(id))
  if (allSelected) {
    // Deselect: remove all students of this course from the selection.
    store.draft.studentIds = store.draft.studentIds.filter((id: string) => !studentIds.includes(id))
  } else {
    // Select: add all students of this course to the selection (no duplicates).
    const set = new Set([...store.draft.studentIds, ...studentIds])
    store.draft.studentIds = Array.from(set)
  }
  // Sync the course-selection list.
  syncCourseSelection()
}

// Toggle a student checkbox (for individual selection).
const toggleStudent = (studentUserId: string) => {
  if (!studentUserId || typeof studentUserId !== 'string' || !studentUserId.trim()) return
  const index = store.draft.studentIds.indexOf(studentUserId)
  if (index > -1) {
    store.draft.studentIds.splice(index, 1)
  } else {
    store.draft.studentIds.push(studentUserId)
  }
  // After each toggle: sync the course selection.
  syncCourseSelection()
}

// Sync store.draft.courseIds with the current student selection state.
async function syncCourseSelection() {
  // For each course: if all students are selected, include it in courseIds.
  const newCourseIds: string[] = []
  for (const course of courses.value) {
    if (courseStudentsCache.value.has(course.courseId)) {
      const studentIds = courseStudentsCache.value.get(course.courseId)!.map((s: any) => s.userId)
      if (studentIds.length > 0 && studentIds.every((id) => store.draft.studentIds.includes(id))) {
        newCourseIds.push(course.courseId)
      }
    }
  }
  store.draft.courseIds = newCourseIds
}

const handleNext = () => {
  // Block if credentials missing — banner already explains why
  if (!credStore.hasCredential) {
    toast.warning(t('AppsDetailView.missingCredsTitle'))
    return
  }

  // Check that the name is filled in.
  if (!store.draft.name || store.draft.name.trim() === '') {
    toast.warning(t('deployment.errors.missingName'))
    return
  }

  // Check that at least one student is selected.
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

// Load courses.
async function loadCourses() {
  loadingCourses.value = true
  coursesError.value = null
  try {
    const res = await courseApi.list(0, 200)
    courses.value = res.data || []
  } catch {
    coursesError.value = t('CoursesView.toasts.loadError')
    toast.error(coursesError.value)
  } finally {
    loadingCourses.value = false
  }
}

// Load the initial student list (cached).
async function loadAllStudents() {
  loadingStudents.value = true
  studentsError.value = null
  try {
    const res = await userApi.list({ role: 'student', limit: 1000 })
    allStudents.value = res.data || []
    students.value = allStudents.value
    cacheStudents(allStudents.value)
  } catch {
    studentsError.value = t('CourseDetailView.toasts.loadUsersError')
    toast.error(studentsError.value)
  } finally {
    loadingStudents.value = false
  }
}

// Search with debouncing.
let searchTimer: number | undefined
// Id of the toast the last failed search produced. Only this one is dismissed
// when the next search runs — ``toast.clear()`` would also drop unrelated
// toasts (e.g. the missing-credentials warning).
let searchErrorToastId: string | null = null
const dismissSearchError = () => {
  if (searchErrorToastId !== null) {
    toast.remove(searchErrorToastId)
    searchErrorToastId = null
  }
}
watch(studentSearchQuery, (val) => {
  if (searchTimer) window.clearTimeout(searchTimer)
  searchTimer = window.setTimeout(async () => {
    const q = val?.trim() || ''

    // Empty query: show the initial list (no extra API call).
    if (!q) {
      students.value = allStudents.value
      dismissSearchError()
      return
    }

    // Query too short: keep the current list (no flicker).
    if (q.length < 2) {
      dismissSearchError()
      return
    }

    // Perform the search.
    try {
      loadingStudents.value = true
      const res = await userApi.search(q, 50)
      dismissSearchError()
      students.value = res.data || []
      cacheStudents(students.value) // Cache new students (keyed by userId)
    } catch (err) {
      console.error('User search error:', err)
      const e: any = err
      const msg = getErrorDetailMessage(e) || e?.message || t('CourseDetailView.toasts.loadUsersError')
      searchErrorToastId = toast.error(msg)
    } finally {
      loadingStudents.value = false
    }
  }, 300)
})

// On mount, load courses + the initial students.
onMounted(async () => {
  // Ensure cred state is fresh; banner branch shows when missing
  if (!credStore.status) await credStore.fetch()
  await loadCourses()
  loadCourseStudentCounts()
  await loadAllStudents()
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
                      <span v-else>{{ t('DeploymentDetailView.deploymentStudentCount', getStudentCountForCourse(course.courseId)) }}</span>
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