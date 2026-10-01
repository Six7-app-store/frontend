/**
 * Role behaviour of the deployments list.
 *
 * The sibling ``DeploymentsListView.spec.ts`` is skipped pending a
 * rewrite against the PageHeader/EntityListState/Card structure. This
 * file covers only what the role split added, so the student view has
 * regression cover even while the older suite is dormant:
 *
 *   * students never see a "new deployment" affordance (the backend
 *     rejects the create with ``role_required`` — the UI must not offer
 *     a path that ends in a 403)
 *   * students get "Meine Umgebungen", staff get "Deployments"
 *   * the twelve lifecycle states collapse to three for students
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { computed } from 'vue'

// --- MOCKS ---------------------------------------------------------
let mockDeployments: any[] = []
let mockRole: 'student' | 'teacher' = 'teacher'

vi.mock('@/stores/deployment.store', () => ({
  useDeploymentStore: () => ({
    get deployments() { return mockDeployments },
    get isLoading() { return false },
    fetchDeployments: vi.fn(),
  }),
}))

vi.mock('@/stores/app.store', () => ({
  useAppStore: () => ({
    get apps() { return [{ appId: 'a1', name: 'Ubuntu Lab' }] },
    fetchApps: vi.fn(),
  }),
}))

vi.mock('@/composables/useRole', () => ({
  useRole: () => ({
    isStaff: computed(() => mockRole === 'teacher'),
    isStudent: computed(() => mockRole === 'student'),
  }),
}))

vi.mock('lucide-vue-next', () => {
  const icon = { template: '<span />' }
  return {
    BarChart3: icon, Plus: icon, Inbox: icon,
    GitBranch: icon, Box: icon, Clock: icon, ArrowRight: icon,
    Loader2: icon,
  }
})

import DeploymentsListView from '@/views/DeploymentsListView.vue'

const deployment = (status: string | null) => ({
  deploymentId: 'd1',
  name: 'Labor 1',
  appId: 'a1',
  releaseTag: 'main',
  status,
  created_at: '2026-09-01T10:00:00Z',
})

const render = () =>
  mount(DeploymentsListView, {
    global: {
      mocks: { $t: (key: string) => key },
      stubs: {
        RouterLink: { template: '<a><slot /></a>', props: ['to'] },
        BaseButton: { template: '<button><slot /></button>' },
        Card: { template: '<div><slot /></div>' },
        PageHeader: {
          props: ['title', 'subtitle'],
          template: '<div><h1>{{ title }}</h1><p>{{ subtitle }}</p><slot name="actions" /></div>',
        },
        // Renders the empty-action slot when empty, the list otherwise —
        // a plain ``true`` stub would swallow both.
        EntityListState: {
          props: ['isLoading', 'isEmpty', 'icon', 'emptyMessage'],
          template:
            '<div><span>{{ emptyMessage }}</span>' +
            '<slot v-if="isEmpty" name="empty-action" /><slot v-else /></div>',
        },
      },
    },
  })

beforeEach(() => {
  mockDeployments = [deployment('success')]
  mockRole = 'teacher'
})

describe('DeploymentsListView — role split', () => {
  it('offers the create button to staff', () => {
    expect(render().html()).toContain('DeploymentsView.newDeployment')
  })

  it('hides the create button from students, in the header and when empty', () => {
    mockRole = 'student'
    expect(render().html()).not.toContain('DeploymentsView.newDeployment')

    mockDeployments = []
    const empty = render().html()
    expect(empty).not.toContain('DeploymentsView.newDeployment')
    expect(empty).toContain('DeploymentsView.emptyStudentHint')
  })

  it('titles the page "Meine Umgebungen" for students', () => {
    expect(render().find('h1').text()).toBe('DeploymentsView.title')

    mockRole = 'student'
    const student = render()
    expect(student.find('h1').text()).toBe('DeploymentsView.titleStudent')
    expect(student.find('p').text()).toBe('DeploymentsView.subtitleStudent')
  })

  it('names the empty state after who acts next, for students', () => {
    mockRole = 'student'
    mockDeployments = []
    expect(render().html()).toContain('DeploymentsView.emptyStudent')
  })

  it.each([
    ['success', 'studentReady'],
    ['pending', 'studentPreparing'],
    ['running', 'studentPreparing'],
    ['resuming', 'studentPreparing'],
    [null, 'studentPreparing'],
    ['failed', 'studentUnavailable'],
    ['paused', 'studentUnavailable'],
    ['destroyed', 'studentUnavailable'],
    ['pause_failed', 'studentUnavailable'],
  ])('collapses status %s to %s for students', (status, expected) => {
    mockRole = 'student'
    mockDeployments = [deployment(status as string | null)]
    expect(render().html()).toContain(`DeploymentsView.${expected}`)
  })

  it('keeps the raw lifecycle status for staff', () => {
    mockDeployments = [deployment('pause_failed')]
    const html = render().html()
    expect(html).toContain('pause_failed')
    expect(html).not.toContain('DeploymentsView.studentUnavailable')
  })
})
