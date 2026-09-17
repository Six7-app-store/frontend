/**
 * Characterization tests for ``DeploymentDetailView``.
 *
 * Purpose: pin down the CURRENT observable behaviour of the detail page
 * (rendered markup, visible texts, API calls, toasts, navigation) as a
 * safety net for splitting the view into components, composables and
 * services. These tests describe what the page does today — including
 * quirks that may be bugs — not what it should do.
 *
 * Ground rules for the refactoring:
 *  * This file and its snapshots must not change while refactoring.
 *  * Mocks sit only at the system boundaries (API modules, auth store,
 *    router, SSE stream composable). Child components, the deployment and
 *    toast stores, i18n and the icon library are real, so the tests keep
 *    working no matter where the logic ends up inside the frontend.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises, enableAutoUnmount, RouterLinkStub, type VueWrapper } from '@vue/test-utils'
import { nextTick, ref } from 'vue'
import { createPinia, setActivePinia, type Pinia } from 'pinia'
import { createI18n } from 'vue-i18n'

import DeploymentDetailView from '@/views/DeploymentDetailView.vue'
import { useToastStore } from '@/stores/toast.store'
import { useDeploymentStore } from '@/stores/deployment.store'
import de from '../../../src/i18n/locales/de'
import type { DeploymentResource, DeploymentWithRelations, Task, User } from '@/types'

// Dates are rendered with ``toLocaleString('de-DE')`` — pin the zone so the
// snapshots don't depend on the machine running the tests.
process.env.TZ = 'UTC'

// ---------------------------------------------------------
// Boundary mocks
// ---------------------------------------------------------

const h = vi.hoisted(() => ({
  push: vi.fn(),
  deploymentApi: {
    getById: vi.fn(),
    delete: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    resendAccess: vi.fn(),
    getMyAccess: vi.fn(),
    listResources: vi.fn(),
    getResourceDetail: vi.fn(),
    redeployResource: vi.fn(),
  },
  taskApi: {
    listByDeployment: vi.fn(),
    getById: vi.fn(),
  },
  startStream: vi.fn(),
  stopStream: vi.fn(),
}))

vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { id: 'dep-1' } }),
  useRouter: () => ({ push: h.push }),
}))

vi.mock('@/api/deployment.api', () => ({ deploymentApi: h.deploymentApi }))
vi.mock('@/api/task.api', () => ({ taskApi: h.taskApi }))
// Only imported transitively by the deployment store → app store.
vi.mock('@/api/app.api', () => ({ appApi: {} }))

const authState: { user: User | null } = { user: null }
vi.mock('@/stores/auth.store', () => ({
  useAuthStore: () => ({
    get user() {
      return authState.user
    },
    get userId() {
      return authState.user?.userId ?? null
    },
  }),
}))

const stream = {
  progress: ref<number | null>(null),
  currentPhase: ref<string | null>(null),
  currentPhaseIndex: ref<number | null>(null),
  totalPhases: ref<number>(11),
  phaseNames: ref<string[]>([]),
  liveLogs: ref<Array<Record<string, unknown>>>([]),
  totalLogCount: ref<number>(0),
  connectionState: ref<string>('idle'),
  lastError: ref<string | null>(null),
}
vi.mock('@/composables/useDeploymentStream', () => ({
  useDeploymentStream: () => ({ ...stream, start: h.startStream, stop: h.stopStream }),
}))

// ---------------------------------------------------------
// Fixtures
// ---------------------------------------------------------

const t = (key: string, named?: Record<string, unknown>): string => i18n.global.t(key, named ?? {})
let i18n = createI18n({ legacy: false, locale: 'de', messages: { de } })

const makeUser = (overrides: Partial<User> = {}): User =>
  ({
    userId: 'staff-1',
    username: 'teacher',
    email: 'teacher@example.com',
    role: 'teacher',
    courseId: null,
    created_at: '2026-06-01T00:00:00Z',
    ...overrides,
  }) as User

const ADDRESS_VM = 'openstack_compute_instance_v2.team_ide["Team Alpha"]'

const userAccounts = {
  // Strategy 0: derived terraform key "<team>-<email local-part, dots → dashes>"
  'Team Alpha-anna-schmidt': {
    username: 'anna', team: 'Team Alpha', ip: '10.0.0.5', port: 22,
    auth: 'pw-anna', type: 'password', authtype: 'ssh',
  },
  // Strategy 1: account.username carries the member's email
  'x1': {
    username: 'dave@example.com', team: 'Team Alpha', ip: '10.0.0.6', port: 2222,
    auth: 'pw-dave', type: 'password',
  },
  // Strategy 2: username substring
  'Team Beta-robert': {
    username: 'bob', team: 'Team Beta', ip: '1.2.3.4', port: 8081,
    auth: 'pw-bob', type: 'password', authtype: 'url',
  },
  // Strategy 3: account key contains the member username (no username field)
  'Team Beta-erin': {
    team: 'Team Beta', ip: '1.2.3.4', port: 22, type: 'ssh_key',
  },
}

const teamVms = {
  'Team Beta': { url: 'http://1.2.3.4/pgadmin4/', floating_ip: '1.2.3.4' },
}

const makeDeployment = (overrides: Partial<DeploymentWithRelations> = {}): DeploymentWithRelations =>
  ({
    deploymentId: 'dep-1',
    name: 'Data Lab',
    appId: 'app-1',
    userId: 'owner-1',
    status: 'success',
    commitHash: null,
    commitInfo: null,
    userInputVar: JSON.stringify({
      groupNames: ['Group A'],
      assignments: { 0: ['student-1', 'student-2'], 1: ['student-3'] },
      variables: {
        image: 'ubuntu:22.04 # default image',
        flavor: '"m1.small"',
        empty: '',
      },
    }),
    releaseTag: 'v1.2.3',
    created_at: '2026-06-08T12:00:00Z',
    user: makeUser({ userId: 'owner-1', username: 'owner', email: 'owner@example.com' }),
    app: {
      appId: 'app-1',
      name: 'Notebook Stack',
      description: 'Jupyter **deployment**',
      git_link: 'https://git.example/app.git',
      userId: 'owner-1',
      created_at: '2026-06-01T00:00:00Z',
      releaseTag: 'v1.2.3',
      is_private: false,
    },
    teams: [
      {
        teamId: 'team-alpha',
        name: 'Team Alpha',
        members: [
          { userId: 'u-anna', username: 'anna', email: 'anna.schmidt@example.com' },
          { userId: 'u-dave', username: 'dave', email: 'dave@example.com' },
        ],
      },
      {
        teamId: 'team-beta',
        name: 'Team Beta',
        members: [
          { userId: 'u-bob', username: 'bob', email: 'robert.b@example.com' },
          { userId: 'u-erin', username: 'erin', email: 'e.k@example.com' },
          { userId: 'u-carl', username: 'carl', email: 'carl@example.com' },
          // Would match anna's account by substring — the team guard rejects it.
          { userId: 'u-annabelle', username: 'annabelle', email: 'annabelle@example.com' },
        ],
      },
    ],
    outputs: null,
    logs: null,
    latest_task: null,
    ...overrides,
  }) as DeploymentWithRelations

const makeTask = (overrides: Partial<Task> = {}): Task => ({
  taskId: 'task-deploy',
  deploymentId: 'dep-1',
  celeryTaskId: 'celery-deploy',
  type: 'deploy',
  status: 'success',
  started_at: '2026-06-08T12:10:00Z',
  finished_at: '2026-06-08T12:20:00Z',
  logs: {
    logs: [
      { timestamp: '2026-06-08T12:15:00Z', level: 'INFO', message: 'hello from the worker' },
      { timestamp: '2026-06-08T12:16:00Z', level: 'INFO', message: 'apply complete' },
    ],
  },
  tf_state: { resources: [{ name: 'vm-1' }, { name: 'net-1' }] },
  // Owner path: outputs arrive as a JSON string from the DB text column.
  outputs: JSON.stringify({
    user_accounts: { value: userAccounts },
    team_vms: { value: teamVms },
  }),
  current_phase: 'OUTPUTS_AND_CLEANUP',
  progress_pct: 100,
  created_at: '2026-06-08T12:09:00Z',
  ...overrides,
})

const olderFailedTask = makeTask({
  taskId: 'task-old',
  celeryTaskId: 'celery-old',
  status: 'failed',
  logs: 'Task failed: terraform exploded\nTraceback (most recent call last):\n  boom',
  tf_state: null,
  outputs: null,
  created_at: '2026-06-01T08:00:00Z',
})

const makeResource = (overrides: Partial<DeploymentResource> = {}): DeploymentResource => ({
  address: ADDRESS_VM,
  type: 'openstack_compute_instance_v2',
  category: 'instance',
  team: 'Team Alpha',
  provider_id: 'uuid-vm-1',
  display_name: 'team-alpha-ide',
  drift: 'in_sync',
  lifecycle: { status: 'ACTIVE', task_state: null, vm_state: 'active', power_state: 'RUNNING', fault_message: null },
  hardware: {
    flavor_name: 'm1.small', ram_mb: 2048, vcpus: 1, disk_gb: 20, image_id: 'img-123456789',
    image_name: null, availability_zone: 'nova', launched_at: null,
  },
  addresses: [{ network: 'NAT', fixed_ip: '10.0.0.5', floating_ip: '1.2.3.4', mac: null }],
  ...overrides,
})

const resources: DeploymentResource[] = [
  makeResource(),
  makeResource({ address: 'openstack_networking_network_v2.net', type: 'openstack_networking_network_v2', category: 'network', display_name: 'lab-net', lifecycle: null, hardware: null, addresses: [] }),
  makeResource({ address: 'openstack_networking_subnet_v2.sub', type: 'openstack_networking_subnet_v2', category: 'subnet', display_name: 'lab-subnet', lifecycle: null, hardware: null, addresses: [] }),
  makeResource({ address: 'openstack_networking_floatingip_v2.fip', type: 'openstack_networking_floatingip_v2', category: 'floating_ip', display_name: '1.2.3.4', lifecycle: null, hardware: null, addresses: [] }),
  makeResource({ address: 'openstack_networking_secgroup_v2.sg', type: 'openstack_networking_secgroup_v2', category: 'security_group', display_name: 'lab-sg', lifecycle: null, hardware: null, addresses: [] }),
]

const httpError = (status: number | undefined, detail?: unknown, message?: string) =>
  Object.assign(new Error(message ?? ''), {
    message: message ?? '',
    response: status === undefined ? undefined : { status, data: { detail } },
  })

// ---------------------------------------------------------
// Helpers
// ---------------------------------------------------------

let pinia: Pinia

// Drain pending promise chains. A single ``flushPromises`` proved to be
// timing-sensitive for the longer async handlers (reload after lifecycle
// actions, stream-ended handler), so flush a few rounds.
const settle = async () => {
  for (let i = 0; i < 5; i++) await flushPromises()
}

const mountView = () =>
  mount(DeploymentDetailView, {
    global: {
      plugins: [pinia, i18n],
      stubs: { RouterLink: RouterLinkStub },
    },
  })

const mountLoaded = async () => {
  const wrapper = mountView()
  await settle()
  return wrapper
}

const buttonWithText = (wrapper: VueWrapper, text: string) =>
  wrapper.findAll('button').find((b) => b.text().includes(text))

const lastButton = (row: ReturnType<typeof memberRow>) => {
  const buttons = row.findAll('button')
  return buttons[buttons.length - 1]!
}

const toasts = () => useToastStore().toasts.map(({ type, message }) => ({ type, message }))

const memberRow = (wrapper: VueWrapper, username: string) =>
  wrapper
    .findAll('div.flex.flex-col.lg\\:flex-row')
    .find((row) => row.find('.font-medium.text-gray-900.truncate').text() === username)!

enableAutoUnmount(afterEach)

beforeEach(() => {
  vi.clearAllMocks()
  vi.useRealTimers()
  pinia = createPinia()
  setActivePinia(pinia)
  i18n = createI18n({ legacy: false, locale: 'de', messages: { de } })

  authState.user = makeUser()

  stream.progress.value = null
  stream.currentPhase.value = null
  stream.currentPhaseIndex.value = null
  stream.totalPhases.value = 11
  stream.phaseNames.value = []
  stream.liveLogs.value = []
  stream.totalLogCount.value = 0
  stream.connectionState.value = 'idle'

  h.deploymentApi.getById.mockResolvedValue({ data: makeDeployment() })
  h.deploymentApi.delete.mockResolvedValue({ status: 204 })
  h.deploymentApi.pause.mockResolvedValue({ status: 202, data: { task_id: 't', status: 'pausing' } })
  h.deploymentApi.resume.mockResolvedValue({ status: 202, data: { task_id: 't', status: 'resuming' } })
  h.deploymentApi.resendAccess.mockResolvedValue({ status: 202 })
  h.deploymentApi.getMyAccess.mockResolvedValue({ data: { user_accounts: {}, team_vms: {} } })
  h.deploymentApi.listResources.mockResolvedValue({ data: { resources, live: true } })
  h.deploymentApi.getResourceDetail.mockResolvedValue({ data: makeResource() })
  h.deploymentApi.redeployResource.mockResolvedValue({ status: 202, data: { task_id: 't', status: 'redeploying' } })

  const tasks = [olderFailedTask, makeTask()]
  h.taskApi.listByDeployment.mockResolvedValue({ data: tasks })
  h.taskApi.getById.mockImplementation(async (id: string) => ({
    data: tasks.find((task) => task.taskId === id) ?? makeTask({ taskId: id }),
  }))

  Object.defineProperty(window, 'isSecureContext', { value: true, configurable: true })
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: vi.fn().mockResolvedValue(undefined) },
    configurable: true,
  })

  vi.spyOn(console, 'error').mockImplementation(() => {})
})

// =========================================================
// Loading & load errors
// =========================================================

describe('DeploymentDetailView — Laden', () => {
  it('zeigt nur den Spinner, solange das Deployment lädt', async () => {
    h.deploymentApi.getById.mockReturnValue(new Promise(() => {}))
    const wrapper = mountView()
    await settle()

    expect(wrapper.find('h1').exists()).toBe(false)
    expect(wrapper.find('.animate-spin').exists()).toBe(true)
    expect(wrapper.find('div.flex.items-center.justify-center.py-20').exists()).toBe(true)
  })

  it('bleibt bei einem 5xx-Ladefehler dauerhaft beim Spinner (kein Fehlerzustand)', async () => {
    h.deploymentApi.getById.mockRejectedValue(httpError(500, 'boom'))
    const wrapper = await mountLoaded()

    expect(wrapper.find('h1').exists()).toBe(false)
    expect(wrapper.find('.animate-spin').exists()).toBe(true)
    expect(useDeploymentStore().error).toBe('boom')
    expect(toasts()).toEqual([])
    // Staff → owner view → tasks are still requested.
    expect(h.taskApi.listByDeployment).toHaveBeenCalledWith('dep-1')
  })

  it('bleibt bei 404 ebenfalls beim Spinner', async () => {
    h.deploymentApi.getById.mockRejectedValue(httpError(404, 'not found'))
    const wrapper = await mountLoaded()

    expect(wrapper.find('h1').exists()).toBe(false)
    expect(useDeploymentStore().error).toBeNull()
  })
})

// =========================================================
// Owner view — data display
// =========================================================

describe('DeploymentDetailView — Owner-Ansicht', () => {
  it('lädt Deployment, Tasks, Outputs des neuesten Tasks und Ressourcen', async () => {
    const wrapper = await mountLoaded()

    expect(h.deploymentApi.getById).toHaveBeenCalledWith('dep-1')
    expect(h.taskApi.listByDeployment).toHaveBeenCalledWith('dep-1')
    expect(h.taskApi.getById).toHaveBeenCalledTimes(1)
    expect(h.taskApi.getById).toHaveBeenCalledWith('task-deploy')
    expect(h.deploymentApi.listResources).toHaveBeenCalledWith('dep-1', { refresh: true })
    expect(h.deploymentApi.getMyAccess).not.toHaveBeenCalled()
    expect(h.startStream).not.toHaveBeenCalled()

    expect(wrapper.html()).toMatchSnapshot('owner-full')
  })

  it('zeigt Header, Status und die drei Info-Karten', async () => {
    const wrapper = await mountLoaded()
    const text = wrapper.text()

    expect(wrapper.find('h1').text()).toBe('Data Lab')
    expect(text).toContain('Deployment Details')
    expect(text).toContain(t('DeploymentsView.deploymentSuccessful'))
    expect(wrapper.findComponent(RouterLinkStub).props('to')).toEqual({ name: 'deployments.list' })

    expect(text).toContain('Deployment Info')
    expect(text).toContain('v1.2.3')
    expect(text).toContain('08.06.2026, 12:00:00')
    expect(text).toContain('Notebook Stack')
    expect(wrapper.find('strong').text()).toBe('deployment')
    expect(wrapper.find('a[href="https://git.example/app.git"]').exists()).toBe(true)
    expect(text).toContain('OW')
    expect(text).toContain('owner@example.com')
    expect(text).toContain('teacher')
  })

  it('zeigt Platzhalter ohne App-Beschreibung, ohne App und ohne User', async () => {
    const base = makeDeployment()
    h.deploymentApi.getById.mockResolvedValue({
      data: { ...base, app: { ...base.app, description: '   ' } },
    })
    let wrapper = await mountLoaded()
    expect(wrapper.text()).toContain('No description')
    wrapper.unmount()

    h.deploymentApi.getById.mockResolvedValue({
      data: { ...base, app: null, user: null },
    })
    wrapper = await mountLoaded()
    expect(wrapper.text()).toContain('No app information available')
    expect(wrapper.text()).toContain('No user information available')
  })

  it('zeigt Gruppen mit Drill-down und Fallback-Namen', async () => {
    const wrapper = await mountLoaded()
    const groupCards = wrapper.findAll('div.cursor-pointer').filter((c) => c.text().includes('Studenten') || c.text().includes('Student'))

    expect(groupCards.map((c) => c.text())).toEqual([
      '1Group A2 Studenten',
      '2Gruppe 21 Student',
    ])

    await groupCards[0]!.trigger('click')
    await nextTick()
    expect(wrapper.text()).toContain('student-1')
    expect(wrapper.text()).toContain('student-2')
    expect(wrapper.text()).toContain(t('DeploymentDetailView.deploymentGroupsBack'))

    await buttonWithText(wrapper, t('DeploymentDetailView.deploymentGroupsBack'))!.trigger('click')
    await nextTick()
    expect(wrapper.text()).not.toContain('student-1')
    expect(wrapper.text()).toContain('Gruppe 2')
  })

  it('zeigt bereinigte Deployment-Variablen', async () => {
    const wrapper = await mountLoaded()
    const cards = wrapper.findAll('div.bg-gray-50.rounded-lg.p-4.border.border-gray-200')
      .filter((c) => c.find('.font-mono').exists())
      .map((c) => c.text())

    expect(cards).toEqual(['imageubuntu:22.04', 'flavorm1.small', 'empty-'])
  })

  it('ordnet Mitgliedern ihre Zugangsdaten zu (Key, E-Mail, Username, Key-Substring, Team-Guard)', async () => {
    const wrapper = await mountLoaded()

    const anna = memberRow(wrapper, 'anna').text()
    expect(anna).toContain('SSH:ssh anna@10.0.0.5')
    expect(anna).not.toContain('URL:')
    expect(anna).toContain('PW:••••••••')

    const dave = memberRow(wrapper, 'dave').text()
    expect(dave).toContain('URL:10.0.0.6:2222')
    expect(dave).toContain('SSH:ssh -p 2222 dave@example.com@10.0.0.6')
    expect(memberRow(wrapper, 'dave').find('a').attributes('href')).toBe('http://10.0.0.6:2222')

    const bob = memberRow(wrapper, 'bob')
    expect(bob.text()).toContain('User:bob')
    expect(bob.text()).toContain('URL:1.2.3.4:8081/pgadmin4')
    expect(bob.text()).not.toContain('SSH:')
    expect(bob.find('a').attributes('href')).toBe('http://1.2.3.4:8081/pgadmin4')

    const erin = memberRow(wrapper, 'erin')
    expect(erin.text()).toContain('User:')
    expect(erin.text()).toContain('URL:1.2.3.4/pgadmin4/')
    expect(erin.find('a').attributes('href')).toBe('http://1.2.3.4/pgadmin4/')
    expect(erin.text()).not.toContain('PW:')

    expect(memberRow(wrapper, 'carl').text()).not.toContain('URL:')
    expect(memberRow(wrapper, 'annabelle').text()).not.toContain('SSH:')
    expect(memberRow(wrapper, 'annabelle').text()).not.toContain('PW:')

    expect(wrapper.text()).toContain('2 members')
    expect(wrapper.text()).toContain('4 members')
  })

  it('schaltet die Passwort-Sichtbarkeit pro Account um', async () => {
    const wrapper = await mountLoaded()
    const row = memberRow(wrapper, 'anna')
    const toggle = row.findAll('button').find((b) => b.attributes('title') === undefined)!

    await toggle.trigger('click')
    expect(memberRow(wrapper, 'anna').text()).toContain('PW:pw-anna')
    expect(memberRow(wrapper, 'dave').text()).toContain('PW:••••••••')

    await toggle.trigger('click')
    expect(memberRow(wrapper, 'anna').text()).not.toContain('pw-anna')
  })

  it('kopiert in die Zwischenablage und zeigt 1,5 s lang „Kopiert!“', async () => {
    const wrapper = await mountLoaded()
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })

    const copySsh = memberRow(wrapper, 'anna').find('button[title="SSH-Befehl kopieren"]')
    await copySsh.trigger('click')
    await settle()

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('ssh anna@10.0.0.5')
    expect(memberRow(wrapper, 'anna').find('button[title="Kopiert!"]').exists()).toBe(true)

    // Only one "just copied" target page-wide.
    await memberRow(wrapper, 'anna').find('button[title="Passwort kopieren"]').trigger('click')
    await settle()
    expect(navigator.clipboard.writeText).toHaveBeenLastCalledWith('pw-anna')
    expect(memberRow(wrapper, 'anna').find('button[title="SSH-Befehl kopieren"]').exists()).toBe(true)
    expect(memberRow(wrapper, 'anna').findAll('button[title="Kopiert!"]')).toHaveLength(1)

    vi.advanceTimersByTime(1500)
    await nextTick()
    expect(memberRow(wrapper, 'anna').find('button[title="Kopiert!"]').exists()).toBe(false)
  })

  it('nutzt ohne Secure Context den execCommand-Fallback', async () => {
    Object.defineProperty(window, 'isSecureContext', { value: false, configurable: true })
    const execCommand = vi.fn().mockReturnValue(true)
    Object.defineProperty(document, 'execCommand', { value: execCommand, configurable: true })
    const wrapper = await mountLoaded()

    await memberRow(wrapper, 'bob').find('button[title="Username kopieren"]').trigger('click')
    await settle()

    expect(execCommand).toHaveBeenCalledWith('copy')
    expect(navigator.clipboard.writeText).not.toHaveBeenCalled()
    expect(memberRow(wrapper, 'bob').find('button[title="Kopiert!"]').exists()).toBe(true)
  })

  it('gruppiert die Infrastruktur und lädt sie über „Aktualisieren“ neu', async () => {
    const wrapper = await mountLoaded()
    const text = wrapper.text()

    expect(text).toContain('Infrastruktur')
    expect(text).toContain('team-alpha-ide')
    expect(text).toMatch(/Netzwerk\s*3/)
    expect(text).toContain('lab-subnet')
    expect(text).toMatch(/Sicherheit\s*1/)
    expect(text).toContain('lab-sg')

    await buttonWithText(wrapper, 'Aktualisieren')!.trigger('click')
    await settle()
    expect(h.deploymentApi.listResources).toHaveBeenCalledTimes(2)
  })

  it('zeigt Lade- und Leerzustand der VM-Liste', async () => {
    h.deploymentApi.listResources.mockReturnValue(new Promise(() => {}))
    let wrapper = await mountLoaded()
    expect(wrapper.text()).toContain('Lade VMs…')
    wrapper.unmount()

    h.deploymentApi.listResources.mockResolvedValue({ data: { resources: [], live: true } })
    wrapper = await mountLoaded()
    expect(wrapper.text()).toContain('Keine VMs im aktuellen Terraform-State.')
    expect(wrapper.text()).not.toContain('Netzwerk')
  })

  it.each([
    [httpError(412, 'x'), de.vm.resourcesErrors.missingCredentials],
    [httpError(502, 'x'), de.vm.resourcesErrors.unreachable],
    [httpError(500, 'x', 'Request failed with status code 500'), 'Request failed with status code 500'],
    [httpError(500, 'x', ''), de.vm.resourcesErrors.generic],
  ])('zeigt den passenden Infrastruktur-Fehlertext (%#)', async (err, expected) => {
    h.deploymentApi.listResources.mockRejectedValue(err)
    const wrapper = await mountLoaded()

    expect(wrapper.find('.bg-red-50.text-red-800 p').text()).toBe(expected)
  })

  it('leert die Ressourcen bei 404 ohne Fehlermeldung', async () => {
    h.deploymentApi.listResources.mockRejectedValue(httpError(404, 'gone'))
    const wrapper = await mountLoaded()

    expect(wrapper.find('.bg-red-50.text-red-800').exists()).toBe(false)
    expect(wrapper.text()).toContain('Keine VMs im aktuellen Terraform-State.')
  })

  it('öffnet und schließt die VM-Detail-Sidebar über die Karte', async () => {
    const wrapper = await mountLoaded()

    await buttonWithText(wrapper, de.vm.actions.showDetails)!.trigger('click')
    await settle()
    expect(wrapper.find('aside').exists()).toBe(true)
    expect(h.deploymentApi.getResourceDetail).toHaveBeenCalledWith('dep-1', ADDRESS_VM)
    expect(buttonWithText(wrapper, de.vm.actions.hideDetails)).toBeTruthy()

    await buttonWithText(wrapper, de.vm.actions.hideDetails)!.trigger('click')
    await nextTick()
    expect(wrapper.find('aside').exists()).toBe(false)
  })
})

// =========================================================
// Tasks & logs
// =========================================================

describe('DeploymentDetailView — Tasks & Logs', () => {
  const taskRows = (wrapper: VueWrapper) =>
    wrapper.findAll('div.cursor-pointer').filter((row) => row.text().includes('Created:'))

  it('listet die Task-Historie neueste zuerst', async () => {
    const wrapper = await mountLoaded()

    expect(wrapper.text()).toMatch(/Tasks & Logs\s*2/)
    expect(taskRows(wrapper).map((r) => r.text())).toEqual([
      'deploysuccess Created: 08.06.2026, 12:09:00',
      'deployfailed Created: 01.06.2026, 08:00:00',
    ])
  })

  it('öffnet ein Task-Detail mit Logs und Terraform-State und kehrt zur Liste zurück', async () => {
    const wrapper = await mountLoaded()

    await taskRows(wrapper)[0]!.trigger('click')
    await settle()

    expect(h.taskApi.getById).toHaveBeenLastCalledWith('task-deploy')
    const text = wrapper.text()
    expect(text).toContain('celery-deploy')
    expect(text).toContain('2 entries')
    expect(text).toContain('hello from the worker')
    expect(text).toContain(t('DeploymentDetailView.terraformState'))
    expect(text).toContain('2 verwaltete Ressourcen')
    expect(wrapper.html()).toMatchSnapshot('task-detail')

    await buttonWithText(wrapper, 'Back to list')!.trigger('click')
    expect(taskRows(wrapper)).toHaveLength(2)
  })

  it('kopiert Logs und State als formatiertes JSON', async () => {
    const wrapper = await mountLoaded()
    await taskRows(wrapper)[0]!.trigger('click')
    await settle()

    await wrapper.find('button[title="Copy to clipboard"]').trigger('click')
    await settle()
    expect(navigator.clipboard.writeText).toHaveBeenLastCalledWith(JSON.stringify(makeTask().logs, null, 2))
    expect(buttonWithText(wrapper, 'Copied')).toBeTruthy()

    await wrapper.find('button[title="In die Zwischenablage kopieren"]').trigger('click')
    await settle()
    expect(navigator.clipboard.writeText).toHaveBeenLastCalledWith(JSON.stringify(makeTask().tf_state, null, 2))
  })

  it('trennt Fehler-Logs in Überschrift und einklappbare Details; der Toggle bleibt beim Taskwechsel offen', async () => {
    const wrapper = await mountLoaded()

    await taskRows(wrapper)[1]!.trigger('click')
    await settle()
    expect(wrapper.find('.text-red-700 .font-medium').text()).toBe('Task failed: terraform exploded')
    expect(wrapper.text()).not.toContain('Traceback')
    // The selected task drives the data blocks: it has neither tf_state nor
    // outputs, so the state block disappears and — as a side effect — the
    // Teams card loses the credentials that came from the latest task.
    expect(wrapper.text()).not.toContain(t('DeploymentDetailView.terraformState'))
    expect(memberRow(wrapper, 'anna').text()).not.toContain('SSH:')

    await buttonWithText(wrapper, 'Technische Details anzeigen')!.trigger('click')
    expect(wrapper.text()).toContain('Traceback (most recent call last):')

    await buttonWithText(wrapper, 'Back to list')!.trigger('click')
    await taskRows(wrapper)[1]!.trigger('click')
    await settle()
    expect(wrapper.text()).toContain('Technische Details ausblenden')
  })

  it('erkennt den Divider „--- Technische Details ---“', async () => {
    const failing = makeTask({
      taskId: 'task-infra',
      status: 'failed',
      logs: 'Worker nicht erreichbar.\n--- Technische Details ---\nNotRegistered: tasks.deploy',
      tf_state: '{"version": 4}',
    })
    h.taskApi.listByDeployment.mockResolvedValue({ data: [failing] })
    h.taskApi.getById.mockResolvedValue({ data: failing })
    const wrapper = await mountLoaded()

    await taskRows(wrapper)[0]!.trigger('click')
    await settle()
    expect(wrapper.find('.text-red-700 .font-medium').text()).toBe('Worker nicht erreichbar.')
    // State without a ``resources`` array → generic subtitle.
    expect(wrapper.text()).toContain('Erweiterte Details')
    await buttonWithText(wrapper, 'Technische Details anzeigen')!.trigger('click')
    expect(wrapper.find('pre').text()).toBe('NotRegistered: tasks.deploy')
  })

  it('zeigt einen Platzhalter für Tasks ohne Logs und blendet den Zähler bei Nicht-JSON-Logs aus', async () => {
    const noLogs = makeTask({ taskId: 'task-nologs', logs: null })
    const plainLogs = makeTask({ taskId: 'task-plain', logs: 'just text', created_at: '2026-06-02T00:00:00Z' })
    h.taskApi.listByDeployment.mockResolvedValue({ data: [noLogs, plainLogs] })
    h.taskApi.getById.mockImplementation(async (id: string) => ({ data: id === 'task-nologs' ? noLogs : plainLogs }))
    const wrapper = await mountLoaded()

    await taskRows(wrapper)[0]!.trigger('click')
    await settle()
    expect(wrapper.text()).toContain('No logs available for this task')

    await buttonWithText(wrapper, 'Back to list')!.trigger('click')
    await taskRows(wrapper)[1]!.trigger('click')
    await settle()
    expect(wrapper.text()).not.toContain('entries')
    expect(wrapper.text()).toContain('just text')
  })

  it('zeigt einen Fehlertoast, wenn das Task-Detail nicht lädt', async () => {
    const wrapper = await mountLoaded()
    h.taskApi.getById.mockRejectedValue(httpError(500, 'x'))

    await taskRows(wrapper)[0]!.trigger('click')
    await settle()

    expect(toasts()).toEqual([{ type: 'error', message: 'Failed to load task details' }])
    expect(taskRows(wrapper)).toHaveLength(2)
  })

  it('zeigt „No tasks found“ ohne Tasks', async () => {
    h.taskApi.listByDeployment.mockResolvedValue({ data: [] })
    const wrapper = await mountLoaded()

    expect(wrapper.text()).toContain('No tasks found')
    expect(h.taskApi.getById).not.toHaveBeenCalled()
  })
})

// =========================================================
// Member view
// =========================================================

describe('DeploymentDetailView — Member-Ansicht', () => {
  beforeEach(() => {
    authState.user = makeUser({ userId: 'u-anna', username: 'anna', email: 'anna.schmidt@example.com', role: 'student' })
    h.deploymentApi.getMyAccess.mockResolvedValue({
      data: {
        user_accounts: { 'Team Alpha-anna-schmidt': userAccounts['Team Alpha-anna-schmidt'] },
        team_vms: {},
      },
    })
  })

  it('lädt nur die eigenen Zugangsdaten und blendet Owner-Bereiche aus', async () => {
    const wrapper = await mountLoaded()

    expect(h.deploymentApi.getMyAccess).toHaveBeenCalledWith('dep-1')
    expect(h.taskApi.listByDeployment).not.toHaveBeenCalled()
    expect(h.taskApi.getById).not.toHaveBeenCalled()
    expect(h.deploymentApi.listResources).not.toHaveBeenCalled()

    const text = wrapper.text()
    expect(text).toContain(t('DeploymentDetailView.tasksOwnerOnly'))
    expect(text).not.toContain(t('DeploymentDetailView.deploymentDelete'))
    expect(text).not.toContain('Infrastruktur')
    expect(memberRow(wrapper, 'anna').text()).toContain('SSH:ssh anna@10.0.0.5')
    expect(memberRow(wrapper, 'dave').text()).not.toContain('SSH:')

    // Resend button only on the member's own row.
    expect(buttonWithText(memberRow(wrapper, 'anna') as unknown as VueWrapper, t('DeploymentDetailView.resendAccessButton'))).toBeTruthy()
    expect(memberRow(wrapper, 'dave').findAll('button')).toHaveLength(0)

    expect(wrapper.html()).toMatchSnapshot('member')
  })

  it('behandelt den Owner ohne Staff-Rolle als Owner-Ansicht', async () => {
    authState.user = makeUser({ userId: 'owner-1', role: 'student' })
    const wrapper = await mountLoaded()

    expect(h.deploymentApi.getMyAccess).not.toHaveBeenCalled()
    expect(h.taskApi.listByDeployment).toHaveBeenCalledWith('dep-1')
    expect(wrapper.text()).toContain(t('DeploymentDetailView.deploymentDelete'))
  })

  it('loggt einen /my-access-Fehler nur in die Konsole', async () => {
    h.deploymentApi.getMyAccess.mockRejectedValue(httpError(403, 'forbidden'))
    const wrapper = await mountLoaded()

    expect(console.error).toHaveBeenCalledWith('Error loading own access credentials:', expect.anything())
    expect(toasts()).toEqual([])
    expect(memberRow(wrapper, 'anna').text()).not.toContain('SSH:')
  })

  it('deaktiviert den Resend-Button, solange latest_task noch läuft', async () => {
    h.deploymentApi.getById.mockResolvedValue({
      data: makeDeployment({
        latest_task: { taskId: 't', type: 'redeploy', status: 'running', started_at: null, finished_at: null, created_at: '2026-06-08T12:00:00Z' },
      }),
    })
    const wrapper = await mountLoaded()
    const button = memberRow(wrapper, 'anna').find('button:not([title="SSH-Befehl kopieren"]):not([title="Passwort kopieren"])[title]')

    expect(button.attributes('disabled')).toBeDefined()
    expect(button.attributes('title')).toBe(t('DeploymentDetailView.resendAccessBusyTooltip'))
  })
})

// =========================================================
// Lifecycle actions
// =========================================================

describe('DeploymentDetailView — Lifecycle-Aktionen', () => {
  const setStatus = (status: DeploymentWithRelations['status']) =>
    h.deploymentApi.getById.mockResolvedValue({ data: makeDeployment({ status }) })

  it.each([
    ['success', { deleteEnabled: true, action: 'deploymentPause' }],
    ['paused', { deleteEnabled: true, action: 'deploymentResume' }],
    ['pause_failed', { deleteEnabled: true, action: 'deploymentPause' }],
    ['resume_failed', { deleteEnabled: true, action: 'deploymentResume' }],
    ['failed', { deleteEnabled: true, action: null }],
    ['cancelled', { deleteEnabled: true, action: null }],
    ['running', { deleteEnabled: false, action: null }],
    ['pausing', { deleteEnabled: false, action: null }],
    ['destroying', { deleteEnabled: false, action: null }],
  ] as const)('Status %s → Buttons nach Lifecycle-Matrix', async (status, expected) => {
    setStatus(status)
    const wrapper = await mountLoaded()

    const del = buttonWithText(wrapper, t('DeploymentDetailView.deploymentDelete'))!
    expect(del.attributes('disabled') === undefined).toBe(expected.deleteEnabled)
    expect(del.attributes('title')).toBe(
      expected.deleteEnabled
        ? ''
        : 'Delete available when status is success, failed, cancelled, paused, pause_failed, resume_failed',
    )

    const pause = buttonWithText(wrapper, t('DeploymentDetailView.deploymentPause'))
    const resume = buttonWithText(wrapper, t('DeploymentDetailView.deploymentResume'))
    expect(!!pause).toBe(expected.action === 'deploymentPause')
    expect(!!resume).toBe(expected.action === 'deploymentResume')
  })

  it('zeigt den Status-Badge-Text je Status', async () => {
    setStatus('paused')
    const wrapper = await mountLoaded()
    expect(wrapper.find('span.capitalize.rounded-lg').text()).toBe(t('DeploymentsView.deploymentPaused'))
  })

  it('löscht direkt bei 204: Erfolgstoast und Navigation zur Liste', async () => {
    const wrapper = await mountLoaded()

    await buttonWithText(wrapper, t('DeploymentDetailView.deploymentDelete'))!.trigger('click')
    await nextTick()
    expect(wrapper.text()).toContain(t('DeploymentDetailView.confirmDeleteTitle'))
    expect(wrapper.find('.fixed p').html()).toContain('<strong>Data Lab</strong>')

    const confirm = wrapper.findAll('.fixed button').find((b) => b.text() === t('DeploymentDetailView.confirmButton'))!
    await confirm.trigger('click')
    await settle()

    expect(h.deploymentApi.delete).toHaveBeenCalledWith('dep-1')
    expect(toasts()).toEqual([{ type: 'success', message: t('DeploymentDetailView.deleteSuccessToast') }])
    expect(h.push).toHaveBeenCalledWith({ name: 'deployments.list' })
    expect(wrapper.text()).not.toContain(t('DeploymentDetailView.confirmDeleteTitle'))
  })

  it('bleibt bei 202 auf der Seite und lädt Deployment und Tasks neu', async () => {
    h.deploymentApi.delete.mockResolvedValue({ status: 202 })
    const wrapper = await mountLoaded()

    await buttonWithText(wrapper, t('DeploymentDetailView.deploymentDelete'))!.trigger('click')
    await wrapper.findAll('.fixed button').find((b) => b.text() === t('DeploymentDetailView.confirmButton'))!.trigger('click')
    await settle()

    expect(toasts()).toEqual([{ type: 'info', message: t('DeploymentDetailView.deleteStartedToast') }])
    expect(h.deploymentApi.getById).toHaveBeenCalledTimes(2)
    expect(h.taskApi.listByDeployment).toHaveBeenCalledTimes(2)
    expect(h.push).not.toHaveBeenCalled()
    expect(wrapper.find('.fixed').exists()).toBe(false)
  })

  it('zeigt beim Löschfehler den extrahierten Grund', async () => {
    h.deploymentApi.delete.mockRejectedValue(httpError(409, { reason: 'deployment_busy' }))
    const wrapper = await mountLoaded()

    await buttonWithText(wrapper, t('DeploymentDetailView.deploymentDelete'))!.trigger('click')
    await wrapper.findAll('.fixed button').find((b) => b.text() === t('DeploymentDetailView.confirmButton'))!.trigger('click')
    await settle()

    expect(toasts()).toEqual([
      { type: 'error', message: `${t('DeploymentDetailView.deleteErrorToast')}: deployment_busy` },
    ])
    expect(wrapper.find('.fixed').exists()).toBe(false)
  })

  it('schließt den Lösch-Dialog über „Abbrechen“ ohne API-Aufruf', async () => {
    const wrapper = await mountLoaded()

    await buttonWithText(wrapper, t('DeploymentDetailView.deploymentDelete'))!.trigger('click')
    await buttonWithText(wrapper, t('DeploymentDetailView.cancelButton'))!.trigger('click')

    expect(wrapper.find('.fixed').exists()).toBe(false)
    expect(h.deploymentApi.delete).not.toHaveBeenCalled()
  })

  it('pausiert nach Bestätigung und lädt neu', async () => {
    const wrapper = await mountLoaded()

    await buttonWithText(wrapper, t('DeploymentDetailView.deploymentPause'))!.trigger('click')
    await nextTick()
    expect(wrapper.text()).toContain(t('DeploymentDetailView.confirmPauseTitle'))

    const confirm = wrapper.findAll('.fixed button').find((b) => b.text() === t('DeploymentDetailView.deploymentPause'))!
    await confirm.trigger('click')
    await settle()

    expect(h.deploymentApi.pause).toHaveBeenCalledWith('dep-1')
    expect(toasts()).toEqual([{ type: 'info', message: t('DeploymentDetailView.pauseStartedToast') }])
    expect(h.deploymentApi.getById).toHaveBeenCalledTimes(2)
    expect(h.taskApi.listByDeployment).toHaveBeenCalledTimes(2)
    expect(wrapper.find('.fixed').exists()).toBe(false)
  })

  it('setzt fort und meldet Fehler mit Grund', async () => {
    setStatus('paused')
    h.deploymentApi.resume.mockRejectedValue(httpError(500, 'openstack down'))
    const wrapper = await mountLoaded()

    await buttonWithText(wrapper, t('DeploymentDetailView.deploymentResume'))!.trigger('click')
    await nextTick()
    expect(wrapper.text()).toContain(t('DeploymentDetailView.confirmResumeTitle'))
    await wrapper.findAll('.fixed button').find((b) => b.text() === t('DeploymentDetailView.deploymentResume'))!.trigger('click')
    await settle()

    expect(h.deploymentApi.resume).toHaveBeenCalledWith('dep-1')
    expect(toasts()).toEqual([
      { type: 'error', message: `${t('DeploymentDetailView.resumeErrorToast')}: openstack down` },
    ])
    expect(wrapper.find('.fixed').exists()).toBe(false)
  })
})

// =========================================================
// Per-VM redeploy
// =========================================================

describe('DeploymentDetailView — Redeploy', () => {
  const openAndConfirm = async (wrapper: VueWrapper) => {
    await buttonWithText(wrapper, de.vm.actions.redeploy)!.trigger('click')
    await nextTick()
    const confirm = wrapper.findAll('.fixed button').find((b) => b.text() === 'Redeploy')!
    await confirm.trigger('click')
    await settle()
  }

  it('bestätigt per Dialog, startet den Redeploy und lädt die Tasks neu', async () => {
    const wrapper = await mountLoaded()

    await buttonWithText(wrapper, de.vm.actions.redeploy)!.trigger('click')
    await nextTick()
    expect(wrapper.text()).toContain('VM neu erstellen?')
    expect(wrapper.find('.fixed .font-mono').text()).toBe(ADDRESS_VM)

    const confirm = wrapper.findAll('.fixed button').find((b) => b.text() === 'Redeploy')!
    await confirm.trigger('click')
    await settle()

    expect(h.deploymentApi.redeployResource).toHaveBeenCalledWith('dep-1', ADDRESS_VM)
    expect(toasts()).toEqual([{ type: 'success', message: `Redeploy gestartet für ${ADDRESS_VM}` }])
    expect(h.taskApi.listByDeployment).toHaveBeenCalledTimes(2)
    expect(wrapper.find('.fixed').exists()).toBe(false)
    expect(buttonWithText(wrapper, de.vm.actions.redeploying)!.attributes('disabled')).toBeDefined()
  })

  it.each([
    [httpError(422, { reason: 'non_redeployable_resource_type' }), 'Nur Compute-Instanzen können einzeln redeployed werden.'],
    [httpError(422, { reason: 'resource_not_in_state' }), 'Diese Resource ist nicht mehr im aktuellen State.'],
    [httpError(409, 'busy'), 'Es läuft bereits eine Lifecycle-Aktion für dieses Deployment.'],
    [httpError(500, 'x', 'Request failed'), 'Request failed'],
    [httpError(500, 'x', ''), 'Redeploy fehlgeschlagen.'],
  ])('meldet Redeploy-Fehler verständlich (%#)', async (err, message) => {
    h.deploymentApi.redeployResource.mockRejectedValue(err)
    const wrapper = await mountLoaded()

    await openAndConfirm(wrapper)

    expect(toasts()).toEqual([{ type: 'error', message }])
    expect(buttonWithText(wrapper, de.vm.actions.redeploy)!.attributes('disabled')).toBeUndefined()
  })
})

// =========================================================
// Resend access
// =========================================================

describe('DeploymentDetailView — Zugang erneut senden', () => {
  const resendButton = (wrapper: VueWrapper, username: string) =>
    lastButton(memberRow(wrapper, username))

  it('sendet die Zugangsmail und setzt den Button nach 2 s zurück', async () => {
    const wrapper = await mountLoaded()
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })

    await resendButton(wrapper, 'anna').trigger('click')
    await settle()

    expect(h.deploymentApi.resendAccess).toHaveBeenCalledWith('dep-1', 'team-alpha', 'u-anna')
    expect(toasts()).toEqual([{ type: 'success', message: t('DeploymentDetailView.resendAccessSuccess') }])
    expect(resendButton(wrapper, 'anna').text()).toBe(t('DeploymentDetailView.resendAccessSent'))
    expect(resendButton(wrapper, 'dave').text()).toBe(t('DeploymentDetailView.resendAccessButton'))

    vi.advanceTimersByTime(2000)
    await nextTick()
    expect(resendButton(wrapper, 'anna').text()).toBe(t('DeploymentDetailView.resendAccessButton'))
  })

  it('zeigt „Sende...“ während der Anfrage', async () => {
    h.deploymentApi.resendAccess.mockReturnValue(new Promise(() => {}))
    const wrapper = await mountLoaded()

    await resendButton(wrapper, 'anna').trigger('click')
    expect(resendButton(wrapper, 'anna').text()).toBe(t('DeploymentDetailView.resendAccessSending'))
    expect(resendButton(wrapper, 'anna').attributes('disabled')).toBeDefined()
  })

  it.each([
    [httpError(503, { reason: 'smtp_disabled' }), 'warning', 'DeploymentDetailView.resendAccessSmtpDisabled', null],
    [httpError(409, { reason: 'deployment_busy' }), 'warning', 'DeploymentDetailView.resendAccessDeploymentBusy', null],
    [httpError(502, { reason: 'smtp_rejected' }), 'error', 'DeploymentDetailView.resendAccessError', 'smtp_rejected'],
    [httpError(500, 'plain', 'Network Error'), 'error', 'DeploymentDetailView.resendAccessError', 'Network Error'],
    [httpError(undefined, undefined, ''), 'error', 'DeploymentDetailView.resendAccessError', 'unknown'],
  ] as const)('meldet Resend-Fehler (%#) und setzt nach 3 s zurück', async (err, type, key, suffix) => {
    h.deploymentApi.resendAccess.mockRejectedValue(err)
    const wrapper = await mountLoaded()
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })

    await resendButton(wrapper, 'anna').trigger('click')
    await settle()

    expect(toasts()).toEqual([{ type, message: suffix === null ? t(key) : `${t(key)}: ${suffix}` }])
    expect(resendButton(wrapper, 'anna').text()).toBe(t('DeploymentDetailView.resendAccessRetry'))

    vi.advanceTimersByTime(2999)
    await nextTick()
    expect(resendButton(wrapper, 'anna').text()).toBe(t('DeploymentDetailView.resendAccessRetry'))
    vi.advanceTimersByTime(1)
    await nextTick()
    expect(resendButton(wrapper, 'anna').text()).toBe(t('DeploymentDetailView.resendAccessButton'))
  })
})

// =========================================================
// Live stream
// =========================================================

describe('DeploymentDetailView — Live-Stream', () => {
  const runningTask = (overrides: Partial<Task> = {}) =>
    makeTask({
      taskId: 'task-run',
      celeryTaskId: 'celery-run',
      status: 'running',
      started_at: '2026-06-08T13:00:00Z',
      finished_at: null,
      logs: null,
      tf_state: null,
      outputs: null,
      current_phase: 'TERRAFORM_PLAN',
      progress_pct: 45,
      created_at: '2026-06-08T12:59:00Z',
      ...overrides,
    })

  const withRunning = (task: Task, status: DeploymentWithRelations['status'] = 'running') => {
    h.deploymentApi.getById.mockResolvedValue({ data: makeDeployment({ status }) })
    h.taskApi.listByDeployment.mockResolvedValue({ data: [olderFailedTask, makeTask(), task] })
  }

  const stepLabels = (wrapper: VueWrapper) =>
    wrapper.findAll('span.text-\\[10px\\].uppercase.whitespace-nowrap').map((s) => s.text())

  it('startet den Stream für einen laufenden Task und seedet Fortschritt aus der DB', async () => {
    withRunning(runningTask())
    const wrapper = await mountLoaded()

    expect(h.startStream).toHaveBeenCalledTimes(1)
    expect(stream.progress.value).toBe(45)
    expect(stream.currentPhase.value).toBe('TERRAFORM_PLAN')
    expect(stream.currentPhaseIndex.value).toBe(5)

    const text = wrapper.text()
    expect(text).toContain('running since 08.06.2026, 13:00:00')
    expect(text).toContain('task-run')
    expect(text).toContain('idle')
    expect(text).toContain('Terraform Plan')
    expect(text).toMatch(/45\s*%/)
    expect(stepLabels(wrapper)).toEqual([
      'Starting', 'Openstack Setup', 'Git Clone', 'Creds Materialise', 'Packer Init',
      'Packer Validate', 'Packer Build', 'Terraform Init', 'Terraform Plan', 'Terraform Apply',
      'Outputs And Cleanup',
    ])
    expect(text).toContain('Waiting for first log line…')
    // History hides the active task.
    expect(text).toMatch(/Task History\s*2/)
    // Busy deployment → resend disabled.
    expect(lastButton(memberRow(wrapper, 'anna')).attributes('disabled')).toBeDefined()

    expect(wrapper.html()).toMatchSnapshot('running')
  })

  it('zeigt „Worker is starting up…“ ohne Phaseninfo', async () => {
    withRunning(runningTask({ status: 'pending', current_phase: null, progress_pct: null }), 'pending')
    const wrapper = await mountLoaded()

    expect(wrapper.text()).toContain('Worker is starting up…')
    expect(stepLabels(wrapper)).toEqual([])
  })

  it('bevorzugt die Phasennamen des Workers und zeigt Live-Logs', async () => {
    withRunning(runningTask())
    const wrapper = await mountLoaded()

    stream.phaseNames.value = ['STARTING', 'PACKER_BUILD:database', 'TERRAFORM_APPLY']
    stream.totalPhases.value = 3
    stream.currentPhaseIndex.value = 2
    stream.currentPhase.value = 'PACKER_BUILD:database'
    stream.progress.value = 66
    stream.connectionState.value = 'live'
    stream.liveLogs.value = [
      { timestamp: '2026-06-08T13:01:02.123Z', level: 'INFO', message: 'building image', tool: 'packer' },
      { timestamp: '2026-06-08T13:01:03Z', level: 'ERROR', message: 'retrying' },
    ]
    stream.totalLogCount.value = 250
    await nextTick()

    const text = wrapper.text()
    expect(stepLabels(wrapper)).toEqual(['Starting', 'Packer Build [database]', 'Terraform Apply'])
    expect(text).toContain('Stream live')
    expect(text).toMatch(/66\s*%/)
    expect(text).toContain('250 lines')
    expect(text).toContain('· last 2 shown')
    expect(text).toContain('13:01:02[packer]building image')
    expect(wrapper.find('.text-red-400').text()).toContain('retrying')
  })

  it.each([
    ['destroy', 7, ['Starting', 'Openstack Setup', 'Git Clone', 'Creds Materialise', 'Terraform Init', 'Terraform Destroy', 'Cleanup']],
    ['pause', 7, ['Starting', 'Openstack Setup', 'Git Clone', 'Creds Materialise', 'Terraform Init', 'Server Stop', 'Cleanup']],
    ['resume', 7, ['Starting', 'Openstack Setup', 'Git Clone', 'Creds Materialise', 'Terraform Init', 'Server Start', 'Cleanup']],
    ['redeploy', 7, ['Starting', 'Openstack Setup', 'Git Clone', 'Creds Materialise', 'Terraform Init', 'Terraform Apply', 'Cleanup']],
    ['deploy', 8, ['Starting', 'Openstack Setup', 'Git Clone', 'Creds Materialise', 'Terraform Init', 'Terraform Plan', 'Terraform Apply', 'Outputs And Cleanup']],
    ['deploy', 4, ['1', '2', '3', '4']],
  ] as const)('wählt statische Phasen-Labels für %s mit %i Phasen', async (type, total, labels) => {
    stream.totalPhases.value = total
    withRunning(runningTask({ type }))
    const wrapper = await mountLoaded()

    expect(stepLabels(wrapper)).toEqual(labels)
  })

  it('stoppt den Stream bei Stream-Ende und lädt Tasks und Ressourcen nach', async () => {
    withRunning(runningTask())
    const wrapper = await mountLoaded()
    h.taskApi.listByDeployment.mockResolvedValue({ data: [olderFailedTask, makeTask(), runningTask({ status: 'success' })] })
    h.deploymentApi.getById.mockResolvedValue({ data: makeDeployment({ status: 'success' }) })

    stream.connectionState.value = 'ended'
    await settle()

    expect(h.stopStream).toHaveBeenCalledTimes(1)
    expect(h.deploymentApi.getById).toHaveBeenCalledTimes(2)
    // Once from the ended-handler, once from the relevance watcher.
    expect(h.taskApi.listByDeployment).toHaveBeenCalledTimes(3)
    expect(h.deploymentApi.listResources).toHaveBeenCalledTimes(2)
    expect(toasts()).toEqual([])
    expect(h.push).not.toHaveBeenCalled()
    expect(wrapper.text()).toMatch(/Tasks & Logs\s*3/)
  })

  it('navigiert nach erfolgreichem Destroy (Deployment weg) zur Liste', async () => {
    withRunning(runningTask({ type: 'destroy' }), 'destroying')
    await mountLoaded()
    h.deploymentApi.getById.mockRejectedValue(httpError(404, 'gone'))

    stream.connectionState.value = 'ended'
    await settle()

    expect(toasts()).toEqual([{ type: 'success', message: t('DeploymentDetailView.deleteSuccessToast') }])
    expect(h.push).toHaveBeenCalledWith({ name: 'deployments.list' })
  })

  it('meldet einen fehlgeschlagenen Destroy, wenn das Deployment noch existiert', async () => {
    withRunning(runningTask({ type: 'destroy' }), 'destroying')
    await mountLoaded()
    h.taskApi.listByDeployment.mockResolvedValue({ data: [runningTask({ type: 'destroy', status: 'failed' })] })

    stream.connectionState.value = 'ended'
    await settle()

    expect(toasts()).toEqual([{ type: 'error', message: t('DeploymentDetailView.deleteFailedAsyncToast') }])
    expect(h.push).not.toHaveBeenCalled()
  })

  it.each([
    ['pause', 'DeploymentDetailView.pauseFailedAsyncToast'],
    ['resume', 'DeploymentDetailView.resumeFailedAsyncToast'],
  ] as const)('meldet fehlgeschlagenes %s asynchron', async (type, key) => {
    withRunning(runningTask({ type }), type === 'pause' ? 'pausing' : 'resuming')
    await mountLoaded()
    h.taskApi.listByDeployment.mockResolvedValue({ data: [runningTask({ type, status: 'failed' })] })

    stream.connectionState.value = 'ended'
    await settle()

    expect(toasts()).toEqual([{ type: 'error', message: t(key) }])
  })

  it('startet für Member keinen Stream', async () => {
    authState.user = makeUser({ userId: 'u-anna', role: 'student' })
    withRunning(runningTask())
    await mountLoaded()

    expect(h.startStream).not.toHaveBeenCalled()
  })

  it('stoppt den Stream beim Verlassen der Seite', async () => {
    const wrapper = await mountLoaded()
    wrapper.unmount()

    expect(h.stopStream).toHaveBeenCalledTimes(1)
  })
})
