import { computed, ref, watch } from 'vue'
import { useDeploymentStore } from '@/stores/deployment.store'
import { useCourseStudents } from '@/composables/useCourseStudents'
import { useStudentDirectory } from '@/composables/useStudentDirectory'
import { useUserSearch } from '@/composables/useUserSearch'
import type { LoadState } from '@/composables/useWizardApp'

/** What went wrong choosing a course, shown next to the course field. */
export type CourseProblem = 'membersFailed' | 'emptyCourse' | null

/**
 * State of "Für wen?" in the wizard: a course (all its members) or students
 * picked one by one, written straight into the draft.
 *
 * The person search asks Keycloak, so it finds nobody who exists only here
 * — a student provisioned by a Moodle launch has no Keycloak account. Those
 * are reachable through their course, which reads the local member list.
 */
export function useWizardTarget() {
  const store = useDeploymentStore()
  const directory = useStudentDirectory()
  const courseStudents = useCourseStudents()
  const search = useUserSearch({ searchLimit: 50, initialLimit: 0 })

  const coursesState = ref<LoadState>('idle')
  const courseProblem = ref<CourseProblem>(null)

  /** Picking one by one; otherwise a course is picked. */
  const individually = ref(store.draft.studentIds.length > 0 && store.draft.courseIds.length === 0)

  const course = computed(() =>
    courseStudents.courses.value.find((c: any) => c.courseId === store.draft.courseIds[0]) ?? null)

  // Every student the search turns up goes into the directory, so the
  // selection can show their names.
  watch(search.results, (users) => directory.remember(users))

  /** Search hits for the current query; an empty query lists nobody. */
  const hits = computed(() => (search.query.value.trim() ? search.results.value : [])
    .map((s: any) => (s?.userId && directory.studentOf(s.userId)) || s)
    .filter(Boolean))

  const selected = computed(() => store.draft.studentIds
    .map((id) => directory.studentOf(id) ?? { userId: id }))

  async function load() {
    coursesState.value = 'loading'
    try {
      await courseStudents.loadCourses()
      coursesState.value = 'ready'
    } catch {
      coursesState.value = 'error'
      return
    }
    courseStudents.loadCounts()
    directory.ensureLoaded(store.draft.studentIds)
  }

  /** Takes all members of ``courseId`` as the participants. */
  async function chooseCourse(courseId: string) {
    courseProblem.value = null
    if (!courseId) return
    const ids = await courseStudents.memberIds(courseId)
    if (ids === null) {
      courseProblem.value = 'membersFailed'
      return
    }
    if (ids.length === 0) {
      courseProblem.value = 'emptyCourse'
      return
    }
    store.draft.studentIds = ids
    store.draft.courseIds = [courseId]
  }

  /** Adds or removes one student; a course counts only while all its members are in. */
  function toggleStudent(userId: string) {
    if (!userId?.trim()) return
    const ids = store.draft.studentIds
    store.draft.studentIds = ids.includes(userId) ? ids.filter((id) => id !== userId) : [...ids, userId]
    store.draft.courseIds = courseStudents.fullySelectedCourseIds(store.draft.studentIds)
  }

  return {
    courses: courseStudents.courses,
    memberCount: courseStudents.memberCount,
    coursesState,
    courseProblem,
    individually,
    course,
    query: search.query,
    searchError: search.error,
    hits,
    selected,
    load,
    chooseCourse,
    toggleStudent,
  }
}

export type WizardTarget = ReturnType<typeof useWizardTarget>
