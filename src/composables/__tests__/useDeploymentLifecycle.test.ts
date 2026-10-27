import { describe, it, expect, vi, beforeEach } from 'vitest'
import { defineComponent, ref } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'

const h = vi.hoisted(() => ({
  push: vi.fn(),
  deploymentApi: { getById: vi.fn(), delete: vi.fn(), pause: vi.fn(), resume: vi.fn() },
}))
vi.mock('vue-router', () => ({ useRouter: () => ({ push: h.push }) }))
vi.mock('@/api/deployment.api', () => ({ deploymentApi: h.deploymentApi }))
vi.mock('@/api/app.api', () => ({ appApi: {} }))
vi.mock('@/stores/auth.store', () => ({ useAuthStore: () => ({ userId: null }) }))

import { useDeploymentLifecycle } from '@/composables/useDeploymentLifecycle'
import { useToastStore } from '@/stores/toast.store'
import type { ConnectionState } from '@/composables/useDeploymentStream'
import de from '@/i18n/locales/de'
import type { DeploymentWithRelations, Task } from '@/types'

const httpError = (status: number, detail: unknown) =>
  Object.assign(new Error(''), { response: { status, data: { detail } } })

const setup = (status: DeploymentWithRelations['status'] = 'success', owner = true) => {
  const pinia = createPinia()
  setActivePinia(pinia)
  const deployment = ref({ deploymentId: 'dep-1', status } as DeploymentWithRelations)
  const tasks = ref<Task[]>([])
  const activeTask = ref<Task | null>(null)
  const connectionState = ref<ConnectionState>('idle')
  const loadTasks = vi.fn(async () => {})
  const i18n = createI18n({ legacy: false, locale: 'de', messages: { de } })
  let api!: ReturnType<typeof useDeploymentLifecycle>
  mount(defineComponent({
    setup() {
      api = useDeploymentLifecycle({
        deploymentId: 'dep-1', deployment, canOperate: ref(owner), tasks, activeTask, connectionState, loadTasks,
      })
      return () => null
    },
  }), { global: { plugins: [pinia, i18n] } })
  const toasts = () => useToastStore().toasts.map(({ type, message }) => ({ type, message }))
  const t = (key: string) => i18n.global.t(key)
  return { api, deployment, tasks, activeTask, connectionState, loadTasks, toasts, t }
}

describe('useDeploymentLifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    h.deploymentApi.getById.mockResolvedValue({ data: { deploymentId: 'dep-1', status: 'success' } })
  })

  it('gates the actions on owner view and status', () => {
    const { api, deployment } = setup('success')
    expect(api.canDelete.value).toBe(true)
    expect(api.deleteDisabledReason.value).toBe('')
    expect(api.canPauseOrResume.value).toBe(true)
    expect(api.pauseResumeAction.value).toBe('pause')

    deployment.value = { ...deployment.value, status: 'running' }
    expect(api.canDelete.value).toBe(false)
    expect(api.deleteDisabledReason.value).toMatch(/^Delete available when status is/)
    expect(api.canPauseOrResume.value).toBe(false)

    const member = setup('success', false)
    expect(member.api.canDelete.value).toBe(false)
    expect(member.api.canPauseOrResume.value).toBe(false)
  })

  it('leaves the page after a direct soft-delete (204)', async () => {
    h.deploymentApi.delete.mockResolvedValue({ status: 204 })
    const { api, toasts, t } = setup()
    api.showDeleteModal.value = true

    await api.confirmDelete()

    expect(h.deploymentApi.delete).toHaveBeenCalledWith('dep-1', {})
    expect(toasts()).toEqual([{ type: 'success', message: t('DeploymentDetailView.deleteSuccessToast') }])
    expect(h.push).toHaveBeenCalledWith({ name: 'deployments.list' })
    expect(api.showDeleteModal.value).toBe(false)
  })

  it('offers "remove entry" for missing VMs or a failed destroy, owners only', () => {
    const { api, deployment } = setup('success')
    expect(api.entryRemovalReason.value).toBeNull()
    expect(api.canRemoveEntry.value).toBe(false)

    deployment.value = { ...deployment.value, vm_missing_since: '2026-10-25T10:00:00Z' }
    expect(api.entryRemovalReason.value).toBe('vm_missing')
    expect(api.canRemoveEntry.value).toBe(true)

    deployment.value = { ...deployment.value, status: 'destroying' }
    expect(api.canRemoveEntry.value).toBe(false)

    deployment.value = {
      ...deployment.value,
      vm_missing_since: null,
      status: 'failed',
      latest_task: { taskId: 't1', type: 'destroy', status: 'failed', started_at: null, finished_at: null, created_at: '' },
    }
    expect(api.entryRemovalReason.value).toBe('destroy_failed')
    expect(api.canRemoveEntry.value).toBe(true)

    const member = setup('success', false)
    member.deployment.value = { ...member.deployment.value, vm_missing_since: '2026-10-25T10:00:00Z' }
    expect(member.api.entryRemovalReason.value).toBe('vm_missing')
    expect(member.api.canRemoveEntry.value).toBe(false)
  })

  it('removes the entry without a destroy and leaves the page', async () => {
    h.deploymentApi.delete.mockResolvedValue({ status: 204 })
    const { api, toasts, t } = setup()
    api.showRemoveEntryModal.value = true

    await api.confirmRemoveEntry()

    expect(h.deploymentApi.delete).toHaveBeenCalledWith('dep-1', { entryOnly: true })
    expect(toasts()).toEqual([{ type: 'success', message: t('DeploymentDetailView.removeEntrySuccessToast') }])
    expect(h.push).toHaveBeenCalledWith({ name: 'deployments.list' })
    expect(api.showRemoveEntryModal.value).toBe(false)
  })

  it('keeps the user on the page when removing the entry fails', async () => {
    h.deploymentApi.delete.mockRejectedValue(httpError(409, "entry_only is only allowed when the deployment's VMs are missing from OpenStack."))
    const { api, toasts, t } = setup()

    await api.confirmRemoveEntry()

    const [toast] = toasts()
    expect(toast?.type).toBe('error')
    expect(toast?.message.startsWith(t('DeploymentDetailView.removeEntryErrorToast'))).toBe(true)
    expect(h.push).not.toHaveBeenCalled()
  })

  it('stays and reloads after a dispatched destroy (202)', async () => {
    h.deploymentApi.delete.mockResolvedValue({ status: 202 })
    const { api, loadTasks, toasts, t } = setup()

    await api.confirmDelete()

    expect(toasts()).toEqual([{ type: 'info', message: t('DeploymentDetailView.deleteStartedToast') }])
    expect(h.deploymentApi.getById).toHaveBeenCalledWith('dep-1')
    expect(loadTasks).toHaveBeenCalledTimes(1)
    expect(h.push).not.toHaveBeenCalled()
  })

  it('reports a delete refused as busy with the translated reason', async () => {
    h.deploymentApi.delete.mockRejectedValue(httpError(409, { reason: 'deployment_busy' }))
    const { api, toasts, t } = setup()
    api.showDeleteModal.value = true

    await api.confirmDelete()

    expect(toasts()).toEqual([{
      type: 'error',
      message: `${t('DeploymentDetailView.deleteErrorToast')}: ${t('DeploymentDetailView.lifecycleBusy')}`,
    }])
    expect(api.showDeleteModal.value).toBe(false)
  })

  it('sends one DELETE even when confirmed again while the first is in flight', async () => {
    let resolve!: (v: { status: number }) => void
    h.deploymentApi.delete.mockReturnValue(new Promise((r) => { resolve = r }))
    const { api } = setup()

    const first = api.confirmDelete()
    expect(api.deleteBusy.value).toBe(true)
    await api.confirmDelete()
    resolve({ status: 204 })
    await first

    expect(h.deploymentApi.delete).toHaveBeenCalledTimes(1)
    expect(api.deleteBusy.value).toBe(false)
  })

  it('leaves an unknown machine code out of the delete toast', async () => {
    h.deploymentApi.delete.mockRejectedValue(httpError(412, { reason: 'openstack_credentials_missing' }))
    const { api, toasts, t } = setup()

    await api.confirmDelete()

    expect(toasts()).toEqual([{ type: 'error', message: t('DeploymentDetailView.deleteErrorToast') }])
  })

  it.each([
    ['success', 'pause', 'pauseStartedToast'],
    ['paused', 'resume', 'resumeStartedToast'],
  ] as const)('%s → %s after confirmation', async (status, endpoint, toastKey) => {
    h.deploymentApi[endpoint].mockResolvedValue({ status: 202 })
    const { api, loadTasks, toasts, t } = setup(status)
    api.showPauseResumeModal.value = true

    await api.confirmPauseResume()

    expect(h.deploymentApi[endpoint]).toHaveBeenCalledWith('dep-1')
    expect(toasts()).toEqual([{ type: 'info', message: t(`DeploymentDetailView.${toastKey}`) }])
    expect(loadTasks).toHaveBeenCalledTimes(1)
    expect(api.pauseResumeBusy.value).toBe(false)
    expect(api.showPauseResumeModal.value).toBe(false)
  })

  it('reports a failed resume and ignores confirmations without action or while busy', async () => {
    h.deploymentApi.resume.mockRejectedValue(httpError(500, 'openstack down'))
    const paused = setup('paused')
    await paused.api.confirmPauseResume()
    expect(paused.toasts()).toEqual([
      { type: 'error', message: `${paused.t('DeploymentDetailView.resumeErrorToast')}: openstack down` },
    ])

    const failed = setup('failed')
    await failed.api.confirmPauseResume()
    const busy = setup('success')
    busy.api.pauseResumeBusy.value = true
    await busy.api.confirmPauseResume()
    expect(h.deploymentApi.pause).not.toHaveBeenCalled()
  })

  describe('stream end', () => {
    it('navigates to the list when the deployment is gone', async () => {
      h.deploymentApi.getById.mockRejectedValue(httpError(404, 'gone'))
      const { activeTask, connectionState, toasts, t, loadTasks } = setup('destroying')
      activeTask.value = { type: 'destroy', status: 'running' } as Task

      connectionState.value = 'ended'
      await flushPromises()

      expect(loadTasks).toHaveBeenCalledTimes(1)
      expect(toasts()).toEqual([{ type: 'success', message: t('DeploymentDetailView.deleteSuccessToast') }])
      expect(h.push).toHaveBeenCalledWith({ name: 'deployments.list' })
    })

    it('reports a failed destroy when the row still exists', async () => {
      const { activeTask, connectionState, toasts, t } = setup('destroying')
      activeTask.value = { type: 'destroy', status: 'running' } as Task

      connectionState.value = 'ended'
      await flushPromises()

      expect(toasts()).toEqual([{ type: 'error', message: t('DeploymentDetailView.deleteFailedAsyncToast') }])
      expect(h.push).not.toHaveBeenCalled()
    })

    it('reports a failed pause from the reloaded tasks', async () => {
      const { tasks, loadTasks, connectionState, toasts, t } = setup('pausing')
      loadTasks.mockImplementation(async () => {
        tasks.value = [{ type: 'pause', status: 'failed', created_at: '2026-01-01' } as Task]
      })

      connectionState.value = 'ended'
      await flushPromises()

      expect(toasts()).toEqual([{ type: 'error', message: t('DeploymentDetailView.pauseFailedAsyncToast') }])
    })

    it('ignores other connection states', async () => {
      const { connectionState, loadTasks } = setup()
      connectionState.value = 'live'
      await flushPromises()
      expect(loadTasks).not.toHaveBeenCalled()
    })
  })
})
