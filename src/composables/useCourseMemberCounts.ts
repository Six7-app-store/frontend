import { ref } from 'vue'
import { courseApi } from '@/api/course.api'

/**
 * Member count per course for the course cards. The backend has no bulk
 * endpoint for it, so this is one request per course; a list that can't
 * be loaded counts as 0 and only affects that card.
 */
export function useCourseMemberCounts() {
  const counts = ref<Record<string, number>>({})

  async function load(courseIds: readonly string[]) {
    const entries = await Promise.all(courseIds.map(async (courseId) => {
      try {
        return [courseId, (await courseApi.listMembers(courseId)).data.length] as const
      } catch {
        return [courseId, 0] as const
      }
    }))
    counts.value = Object.fromEntries(entries)
  }

  return { counts, load }
}
