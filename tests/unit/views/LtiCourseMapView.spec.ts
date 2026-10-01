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
const importContext = vi.fn()
const listCourses = vi.fn()

vi.mock('vue-router', () => ({
  useRoute: () => ({ query: mockQuery }),
  useRouter: () => ({ replace }),
}))

vi.mock('@/api/lti.api', () => ({
  ltiApi: {
    getContext: (...args: unknown[]) => getContext(...args),
    mapContext: (...args: unknown[]) => mapContext(...args),
    importContext: (...args: unknown[]) => importContext(...args),
  },
}))

vi.mock('@/api/course.api', () => ({
  courseApi: { list: (...args: unknown[]) => listCourses(...args) },
}))

vi.mock('lucide-vue-next', () => {
  const icon = { template: '<span />' }
  return {
    Loader2: icon,
    GraduationCap: icon,
    CheckCircle2: icon,
    AlertCircle: icon,
    DownloadCloud: icon,
  }
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

/**
 * The other way out of this page: there is no Studiengruppe to point
 * at, so one is made from the Moodle course itself. The counts and the
 * skip list are the whole reason this reports back instead of just
 * saying "done" — a lecturer has to see who did *not* come across.
 */
describe('LtiCourseMapView — Studiengruppe aus Moodle anlegen', () => {
  const report = (overrides: Record<string, unknown> = {}) => ({
    context: context('c9'),
    courseId: 'c9',
    courseName: 'Cloud Computing',
    created: 12,
    matched: 3,
    teachers: 1,
    students: 14,
    skipped: [],
    ...overrides,
  })

  it('creates the group and reports what came across', async () => {
    importContext.mockResolvedValue({ data: report() })
    const wrapper = await open()

    await wrapper.find('[data-testid="map-import"]').trigger('click')
    await flushPromises()

    expect(importContext).toHaveBeenCalledWith(CONTEXT_ID)
    expect(wrapper.find('[data-testid="import-success"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Cloud Computing')
    expect(wrapper.text()).toContain('14')
  })

  it('names every member it left alone, and why', async () => {
    importContext.mockResolvedValue({
      data: report({
        skipped: [
          { name: 'Lea Neumann', email: 'lea@dhbw.de', reason: 'link_required' },
          { name: 'Tom Weber', email: 'tom@dhbw.de', reason: 'already_in_another_group' },
        ],
      }),
    })
    const wrapper = await open()

    await wrapper.find('[data-testid="map-import"]').trigger('click')
    await flushPromises()

    const skipped = wrapper.find('[data-testid="import-skipped"]')
    expect(skipped.exists()).toBe(true)
    expect(skipped.text()).toContain('Lea Neumann')
    expect(skipped.text()).toContain('direkt an')
    expect(skipped.text()).toContain('Tom Weber')
    expect(skipped.text()).toContain('anderen Studiengruppe')
  })

  it('says what to switch on in Moodle when the roster is withheld', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    importContext.mockRejectedValue({
      response: { status: 409, data: { detail: { code: 'lti_nrps_unavailable' } } },
    })
    const wrapper = await open()

    await wrapper.find('[data-testid="map-import"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="map-error"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Kursmitglieder abrufen')
  })

  it('makes clear nothing was created when Moodle refuses', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    importContext.mockRejectedValue({
      response: { status: 502, data: { detail: { code: 'lti_nrps_failed' } } },
    })
    const wrapper = await open()

    await wrapper.find('[data-testid="map-import"]').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('nichts angelegt')
  })

  it('leaves the plain mapping untouched', async () => {
    importContext.mockResolvedValue({ data: report() })
    const wrapper = await open()

    await wrapper.find('[data-testid="map-import"]').trigger('click')
    await flushPromises()

    expect(mapContext).not.toHaveBeenCalled()
  })
})
