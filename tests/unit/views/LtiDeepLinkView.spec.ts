/**
 * Answering a deep-linking request from Moodle.
 *
 * Moodle is not opening the tool here — it asks what the activity being
 * created should point at. The lecturer picks an app, and the signed
 * answer is posted back as a form.
 *
 * The form is the part worth pinning down: the response has to leave
 * the *browser*, as a real POST to Moodle's return URL with a field
 * named ``JWT``. A fetch or a redirect would not carry the lecturer's
 * Moodle session, and Moodle accepts nothing else.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

let mockQuery: Record<string, unknown> = {}
const selectDeepLink = vi.fn()
const listApps = vi.fn()

vi.mock('vue-router', () => ({
  useRoute: () => ({ query: mockQuery }),
}))

vi.mock('@/api/lti.api', () => ({
  ltiApi: {
    selectDeepLink: (...args: unknown[]) => selectDeepLink(...args),
  },
}))

vi.mock('@/api/app.api', () => ({
  appApi: { list: (...args: unknown[]) => listApps(...args) },
}))

vi.mock('lucide-vue-next', () => {
  const icon = { template: '<span />' }
  return { Loader2: icon, Link2: icon, AlertCircle: icon }
})

import LtiDeepLinkView from '@/views/LtiDeepLinkView.vue'

const HANDLE = 'dl-handle-1'
const RETURN_URL = 'https://moodle.test/mod/lti/contentitem_return.php'

const open = async (query: Record<string, unknown> = { dl: HANDLE }) => {
  mockQuery = query
  const wrapper = mount(LtiDeepLinkView, { attachTo: document.body })
  await flushPromises()
  return wrapper
}

let submit: ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.clearAllMocks()
  listApps.mockResolvedValue({
    data: [
      { appId: 'a1', name: 'Nextcloud' },
      { appId: 'a2', name: 'Jupyter' },
    ],
  })
  // jsdom refuses to navigate; stub the submit so the form can be read.
  submit = vi.fn()
  HTMLFormElement.prototype.submit = submit
})

afterEach(() => {
  document.body.innerHTML = ''
})

describe('LtiDeepLinkView', () => {
  it('offers the apps the activity could point at', async () => {
    const wrapper = await open()

    expect(listApps).toHaveBeenCalled()
    expect(wrapper.find('[data-testid="deeplink-form"]').exists()).toBe(true)
    expect(wrapper.findAll('option')).toHaveLength(3) // placeholder + 2
  })

  it('will not submit before an app is chosen', async () => {
    const wrapper = await open()

    expect(
      (wrapper.find('[data-testid="deeplink-submit"]').element as HTMLButtonElement)
        .disabled
    ).toBe(true)
  })

  it('posts the signed answer to Moodle as a JWT form field', async () => {
    selectDeepLink.mockResolvedValue({
      data: { jwt: 'signed.jwt.value', returnUrl: RETURN_URL, appName: 'Nextcloud' },
    })
    const wrapper = await open()

    await wrapper.find('[data-testid="deeplink-app"]').setValue('a1')
    await wrapper.find('[data-testid="deeplink-submit"]').trigger('click')
    await flushPromises()

    expect(selectDeepLink).toHaveBeenCalledWith(HANDLE, 'a1')

    const form = document.querySelector('form[method="POST"]') as HTMLFormElement
    expect(form).not.toBeNull()
    expect(form.action).toBe(RETURN_URL)
    const field = form.querySelector('input[name="JWT"]') as HTMLInputElement
    expect(field.value).toBe('signed.jwt.value')
    expect(submit).toHaveBeenCalled()
  })

  it('says to start over in Moodle when the request has expired', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    selectDeepLink.mockRejectedValue({
      response: { status: 409, data: { detail: { code: 'lti_deep_link_expired' } } },
    })
    const wrapper = await open()

    await wrapper.find('[data-testid="deeplink-app"]').setValue('a1')
    await wrapper.find('[data-testid="deeplink-submit"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="deeplink-error"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('noch einmal an')
    expect(submit).not.toHaveBeenCalled()
  })

  it('explains itself when Moodle passed no request', async () => {
    const wrapper = await open({})

    expect(listApps).not.toHaveBeenCalled()
    expect(wrapper.find('[data-testid="deeplink-error"]').exists()).toBe(true)
  })

  it('says so when there is no app to point at yet', async () => {
    listApps.mockResolvedValue({ data: [] })

    const wrapper = await open()

    expect(wrapper.find('[data-testid="deeplink-empty"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="deeplink-app"]').exists()).toBe(false)
  })
})
