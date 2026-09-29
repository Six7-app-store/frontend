import { ref } from 'vue'
import { ltiApi, type LtiContext, type LtiRosterImport } from '@/api/lti.api'
import { courseApi } from '@/api/course.api'
import type { Course } from '@/types'

/**
 * A Moodle course (LTI context) and the Studiengruppe it maps to: loading
 * both sides, saving the mapping, or creating the group from the Moodle
 * roster. Every action throws on failure; the caller says what went wrong.
 */
export function useLtiCourseMapping() {
  const context = ref<LtiContext | null>(null)
  const courses = ref<Course[]>([])
  const report = ref<LtiRosterImport | null>(null)

  /** The context and the courses it can map to; both are needed before anything can be shown. */
  async function load(ltiContextId: string) {
    const [ctxResp, courseResp] = await Promise.all([
      ltiApi.getContext(ltiContextId),
      courseApi.list(),
    ])
    context.value = ctxResp.data
    courses.value = courseResp.data
  }

  async function map(courseId: string) {
    if (!context.value) return
    context.value = (await ltiApi.mapContext(context.value.ltiContextId, courseId)).data
  }

  /** Creates the Studiengruppe from the Moodle roster; the report says who was taken over and who not. */
  async function importRoster() {
    if (!context.value) return
    const { data } = await ltiApi.importContext(context.value.ltiContextId)
    report.value = data
    context.value = data.context
  }

  return { context, courses, report, load, map, importRoster }
}
