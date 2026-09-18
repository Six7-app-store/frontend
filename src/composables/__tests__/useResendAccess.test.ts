import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { defineComponent, ref } from 'vue'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'

const deploymentApi = vi.hoisted(() => ({ resendAccess: vi.fn() }))
vi.mock('@/api/deployment.api', () => ({ deploymentApi }))

import { useResendAccess } from '@/composables/useResendAccess'
import { useToastStore } from '@/stores/toast.store'
import de from '@/i18n/locales/de'
import type { DeploymentWithRelations, Task } from '@/types'

const httpError = (status: number | undefined, detail?: unknown, message = '') =>
  Object.assign(new Error(message), { response: status === undefined ? undefined : { status, data: { detail } } })

const setup = () => {
  const pinia = createPinia()
  setActivePinia(pinia)
  const deployment = ref({ deploymentId: 'dep-1', status: 'success', latest_task: null } as DeploymentWithRelations)
  const activeTask = ref<Task | null>(null)
  const i18n = createI18n({ legacy: false, locale: 'de', messages: { de } })
  let api!: ReturnType<typeof useResendAccess>
  const wrapper = mount(defineComponent({
    setup() {
      api = useResendAccess({ deploymentId: 'dep-1', deployment, activeTask })
      return () => null
    },
  }), { global: { plugins: [pinia, i18n] } })
  const toasts = () => useToastStore().toasts.map(({ type, message }) => ({ type, message }))
  const t = (key: string) => i18n.global.t(key)
  return { api, deployment, activeTask, toasts, t, wrapper }
}

describe('useResendAccess', () => {
  beforeEach(() => {
    deploymentApi.resendAccess.mockReset()
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('tracks the busy state of deployment, active task and latest task', () => {
    const { api, deployment, activeTask } = setup()
    expect(api.isDeploymentBusy.value).toBe(false)

    activeTask.value = { status: 'running' } as Task
    expect(api.isDeploymentBusy.value).toBe(true)

    activeTask.value = null
    deployment.value = { ...deployment.value, latest_task: { status: 'pending' } as DeploymentWithRelations['latest_task'] }
    expect(api.isDeploymentBusy.value).toBe(true)
  })

  it('sends, shows "sending" → "sent" and resets after 2 s', async () => {
    let resolve!: () => void
    deploymentApi.resendAccess.mockReturnValue(new Promise<void>((r) => { resolve = r }))
    const { api, toasts, t } = setup()

    const pending = api.resendAccess('team-a', 'u-1')
    expect(api.resendState.value).toEqual({ 'u-1': 'sending' })
    resolve()
    await pending

    expect(deploymentApi.resendAccess).toHaveBeenCalledWith('dep-1', 'team-a', 'u-1')
    expect(api.resendState.value).toEqual({ 'u-1': 'sent' })
    expect(toasts()).toEqual([{ type: 'success', message: t('DeploymentDetailView.resendAccessSuccess') }])

    vi.advanceTimersByTime(2000)
    expect(api.resendState.value).toEqual({})
  })

  it.each([
    [httpError(503, { reason: 'smtp_disabled' }), 'warning', 'DeploymentDetailView.resendAccessSmtpDisabled', null],
    [httpError(409, { reason: 'deployment_busy' }), 'warning', 'DeploymentDetailView.resendAccessDeploymentBusy', null],
    [httpError(409, { reason: 'smtp_disabled' }), 'error', 'DeploymentDetailView.resendAccessError', 'smtp_disabled'],
    [httpError(500, 'plain', 'Network Error'), 'error', 'DeploymentDetailView.resendAccessError', 'Network Error'],
    [httpError(undefined), 'error', 'DeploymentDetailView.resendAccessError', 'unknown'],
  ] as const)('reports errors (%#) and resets after 3 s', async (err, type, key, suffix) => {
    deploymentApi.resendAccess.mockRejectedValue(err)
    const { api, toasts, t } = setup()

    await api.resendAccess('team-a', 'u-1')

    expect(api.resendState.value).toEqual({ 'u-1': 'error' })
    expect(toasts()).toEqual([{ type, message: suffix === null ? t(key) : `${t(key)}: ${suffix}` }])
    vi.advanceTimersByTime(2999)
    expect(api.resendState.value).toEqual({ 'u-1': 'error' })
    vi.advanceTimersByTime(1)
    expect(api.resendState.value).toEqual({})
  })

  it.each([
    ['success', () => deploymentApi.resendAccess.mockResolvedValue({})],
    ['error', () => deploymentApi.resendAccess.mockRejectedValue(httpError(500, 'boom'))],
  ])('clears its reset timer on unmount (%s)', async (_label, arrange) => {
    arrange()
    const { api, wrapper } = setup()
    await api.resendAccess('team-a', 'u-1')

    // One timer is the toast's own auto-dismiss, the other the reset timer.
    const before = vi.getTimerCount()
    wrapper.unmount()
    expect(vi.getTimerCount()).toBe(before - 1)
  })

  it('keeps the state of other users', async () => {
    deploymentApi.resendAccess.mockResolvedValue({})
    const { api } = setup()

    await api.resendAccess('team-a', 'u-1')
    await api.resendAccess('team-a', 'u-2')

    expect(api.resendState.value).toEqual({ 'u-1': 'sent', 'u-2': 'sent' })
  })
})
