/**
 * Mapping a Moodle course onto a Studiengruppe.
 *
 * This page is the only way the mapping ever gets made, and the mapping
 * is what lets a student launch open one environment instead of a list.
 * It is reached straight from a lecturer's launch, so it has to work
 * with nothing but the context id in the query string.
 *
 * Skipping is a first-class outcome, not an error path: without a
 * mapping a student launch still works, it just lands on the list.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

let mockQuery: Record<string, unknown> = {}
const replace = vi.fn()
const getContext = vi.fn()
const mapContext = vi.fn()
const listCourses = vi.fn()

vi.mock('vue-router', () => ({
  useRoute: () => ({ query: mockQuery }),
  useRouter: () => ({ replace }),
}))

vi.mock('@/api/lti.api', () => ({
  ltiApi: {
    getContext: (...args: unknown[]) => getContext(...args),
    mapContext: (...args: unknown[]) => mapContext(...args),
  },
}))

vi.mock('@/api/course.api', () => ({
  courseApi: { list: (...args: unknown[]) => listCourses(...args) },
}))

vi.mock('lucide-vue-next', () => {
  const icon = { template: '<span />' }
  return { Loader2: icon, GraduationCap: icon, CheckCircle2: icon, AlertCircle: icon }
})

import LtiCourseMapView from '@/views/LtiCourseMapView.vue'

const CONTEXT_ID = 'ctx-1'
const context = (courseId: string | null = null) => ({
  ltiContextId: CONTEXT_ID,
  issuer: 'https://moodle.test',
  context_id: 'moodle-42',
  title: 'Cloud Computing',
  label: 'CC',
  courseId,
})

const open = async (query: Record<string, unknown> = { context: CONTEXT_ID }) => {
  mockQuery = query
  const wrapper = mount(LtiCourseMapView)
  await flushPromises()
  return wrapper
}

beforeEach(() => {
  vi.clearAllMocks()
  getContext.mockResolvedValue({ data: context() })
  listCourses.mockResolvedValue({
    data: [
      { courseId: 'c1', name: 'TINF23B1' },
      { courseId: 'c2', name: 'TINF23B2' },
    ],
  })
})

describe('LtiCourseMapView', () => {
  it('names the Moodle course the lecturer came from', async () => {
    const wrapper = await open()

    expect(getContext).toHaveBeenCalledWith(CONTEXT_ID)
    expect(wrapper.find('[data-testid="map-form"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Cloud Computing')
    expect(wrapper.findAll('option')).toHaveLength(3) // placeholder + 2 courses
  })

  it('preselects a mapping that already exists', async () => {
    getContext.mockResolvedValue({ data: context('c2') })

    const wrapper = await open()

    expect(
      (wrapper.find('[data-testid="map-course"]').element as HTMLSelectElement).value
    ).toBe('c2')
  })

  it('saves the chosen course and confirms it', async () => {
    mapContext.mockResolvedValue({ data: context('c1') })
    const wrapper = await open()

    await wrapper.find('[data-testid="map-course"]').setValue('c1')
    await wrapper.find('[data-testid="map-submit"]').trigger('click')
    await flushPromises()

    expect(mapContext).toHaveBeenCalledWith(CONTEXT_ID, 'c1')
    expect(wrapper.find('[data-testid="map-success"]').exists()).toBe(true)
  })

  it('will not submit before a course is chosen', async () => {
    const wrapper = await open()

    expect(
      (wrapper.find('[data-testid="map-submit"]').element as HTMLButtonElement).disabled
    ).toBe(true)
  })

  it('says whose call it is when the rights are missing', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    mapContext.mockRejectedValue({ response: { status: 403 } })
    const wrapper = await open()

    await wrapper.find('[data-testid="map-course"]').setValue('c1')
    await wrapper.find('[data-testid="map-submit"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="map-error"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Rechte')
  })

  it('treats "später" as a valid answer, not a failure', async () => {
    const wrapper = await open()

    await wrapper.find('[data-testid="map-skip"]').trigger('click')

    expect(replace).toHaveBeenCalledWith('/deployments')
    expect(mapContext).not.toHaveBeenCalled()
  })

  it('explains itself when no Moodle course was passed', async () => {
    const wrapper = await open({})

    expect(getContext).not.toHaveBeenCalled()
    expect(wrapper.find('[data-testid="map-error"]').exists()).toBe(true)
  })
})
