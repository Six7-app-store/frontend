import { ref } from 'vue'
import { courseApi } from '@/api/course.api'
import { useStudentDirectory } from '@/composables/useStudentDirectory'

// At most this many course member lists are fetched at the same time. The
// course list can hold up to 200 entries, and firing all of them at once
// hammers the backend.
export const MAX_PARALLEL_COURSE_LOADS = 5

/**
 * The courses the deployment wizard can pick from, with each course's
 * member list loaded lazily and cached. Every loaded member also lands in
 * the wizard's student directory, so later steps can show their names.
 */
export function useCourseStudents() {
  const directory = useStudentDirectory()
  const courses = ref<any[]>([])
  const members = ref(new Map<string, any[]>())
  const loadingCounts = ref(new Set<string>())

  /** Loads the course list; throws when it can't be loaded. */
  async function loadCourses() {
    const res = await courseApi.list(0, 200)
    courses.value = res.data || []
  }

  /**
   * The member IDs of a course, loaded on first use. ``null`` when the list
   * could not be loaded, so callers can tell a failed request from a course
   * without students.
   */
  async function memberIds(courseId: string): Promise<string[] | null> {
    if (!members.value.has(courseId)) {
      try {
        const res = await courseApi.getById(courseId)
        const users = res.data.users || []
        members.value.set(courseId, users)
        directory.remember(users)
      } catch (err) {
        // Deliberately silent here: the caller decides what to show (the
        // count stays at 0, a click reports the failed load).
        console.error(`Failed to load students for course ${courseId}:`, err)
        return null
      }
    }
    return members.value.get(courseId)!.map((s: any) => s.userId)
  }

  /** Member count of a loaded course; 0 until its list is there. */
  function memberCount(courseId: string) {
    return members.value.get(courseId)?.length ?? 0
  }

  /**
   * Loads the member list of every course not cached yet, at most
   * ``MAX_PARALLEL_COURSE_LOADS`` at a time. Called once after the courses
   * are there — never from the render, which used to start one request per
   * rendered course.
   */
  async function loadCounts() {
    const queue = courses.value
      .map((course: any) => course.courseId as string)
      .filter((courseId) => courseId && !members.value.has(courseId))
    queue.forEach((courseId) => loadingCounts.value.add(courseId))

    const worker = async () => {
      while (queue.length > 0) {
        const courseId = queue.shift()!
        await memberIds(courseId)
        loadingCounts.value.delete(courseId)
      }
    }
    await Promise.all(
      Array.from({ length: Math.min(MAX_PARALLEL_COURSE_LOADS, queue.length) }, worker),
    )
  }

  /** A loaded, non-empty course whose members are all in ``selected``. */
  function isFullySelected(courseId: string, selected: readonly string[]) {
    const list = members.value.get(courseId)
    if (!list || list.length === 0) return false
    return list.every((s: any) => selected.includes(s.userId))
  }

  /** The IDs of all courses fully covered by ``selected``. */
  function fullySelectedCourseIds(selected: readonly string[]) {
    return courses.value
      .map((course: any) => course.courseId as string)
      .filter((courseId) => isFullySelected(courseId, selected))
  }

  return {
    courses,
    loadingCounts,
    loadCourses,
    memberIds,
    memberCount,
    loadCounts,
    isFullySelected,
    fullySelectedCourseIds,
  }
}
