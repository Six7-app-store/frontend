import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'

import AppsView from '@/views/AppsView.vue'

// ---------------------------------------------------------
// 1. Abhängigkeiten (Dependencies) "mocken"
// ---------------------------------------------------------

const mockPush = vi.fn()
vi.mock('vue-router', () => ({
    useRouter: () => ({ push: mockPush })
}))

vi.mock('vue-i18n', () => ({
    useI18n: () => ({
        t: (key: string) => key,
        locale: 'de'
    })
}))

const mockToastError = vi.fn()
vi.mock('@/composables/useToast', () => ({
    useToast: () => ({ error: mockToastError })
}))

vi.mock('@/stores/auth.store', () => ({
    useAuthStore: () => ({ userId: 'other-user-id' })
}))

vi.mock('@/api/app.api', () => ({
    appApi: {
        list: vi.fn(),
        listVersionApprovals: vi.fn().mockResolvedValue({ data: [] }),
    }
}))
import { appApi } from '@/api/app.api'

// ---------------------------------------------------------
// 2. Die Tests
// ---------------------------------------------------------

describe('AppsView.vue', () => {

    beforeEach(() => {
        vi.clearAllMocks()
        // Unterdrücke die Konsolenausgabe für Fehler in unseren Tests
        vi.spyOn(console, 'error').mockImplementation(() => {})
    })

    const mountComponent = () => {
        return mount(AppsView, {
            global: {
                mocks: {
                    $t: (msg: string) => msg
                },
                stubs: {
                    RouterLink: {
                        name: 'RouterLink',
                        props: ['to'],
                        template: '<a :href="to.name" class="router-link-stub"><slot /></a>'
                    },
                    BackCard: { template: '<div><slot /></div>' },
                    BaseButton: { template: '<button><slot /></button>' },
                    AppVersionStatusBadge: { template: '<span></span>' },
                    MarkdownRenderer: {
                        props: ['source'],
                        template: '<div>{{ source }}</div>'
                    }
                }
            }
        })
    }

    // --- Critical Path (Haupt-Funktionen) ---

    it('zeigt den "Empty State" (Keine Apps) an, wenn die API ein leeres Array zurückgibt', async () => {
        ;(appApi.list as any).mockResolvedValue({ data: [] })
        const wrapper = mountComponent()
        await flushPromises()

        // The unified ``EntityListState`` component renders only the
        // description text (no separate heading) when the page is
        // empty — kept consistent across Apps, Deployments, Kurse,
        // Approvals. The ``noAppsTitle`` i18n key is unused since
        // the refactor; keeping the assertion would just test a
        // legacy code path.
        expect(wrapper.text()).toContain('AppsView.noAppsDesc')
    })

    it('zeigt eine Liste von Apps an, wenn die API Daten liefert', async () => {
        const mockApps = [
                { id: '1', name: 'Meine erste Vue App', description: 'Frontend' },
                { id: '2', name: 'NodeJS Backend', description: 'API' }
            ]
        ;(appApi.list as any).mockResolvedValue({ data: mockApps })

        const wrapper = mountComponent()
        await flushPromises()

        expect(wrapper.text()).toContain('Meine erste Vue App')
        expect(wrapper.text()).toContain('NodeJS Backend')
    })

    it('zeigt eine Fehlermeldung (Toast) an, wenn der API-Aufruf fehlschlägt', async () => {
        ;(appApi.list as any).mockRejectedValue(new Error('Netzwerkfehler'))
        mountComponent()
        await flushPromises()

        expect(mockToastError).toHaveBeenCalledTimes(1)
        expect(mockToastError).toHaveBeenCalledWith('AppsView.loadError')
    })

    it('verlinkt die ganze Karte auf die Detailseite der App', async () => {
        const mockApps = [{ appId: 'app-999', name: 'Test App' }]
        ;(appApi.list as any).mockResolvedValue({ data: mockApps })

        const wrapper = mountComponent()
        await flushPromises()

        const card = wrapper.findComponent('[data-testid="app-card"]' as any)
        expect(card.text()).toContain('Test App')
        expect(card.text()).toContain('AppsView.detailsDeploy')
        expect(card.props('to')).toEqual({ name: 'apps.detail', params: { id: 'app-999' } })
    })

    // --- Erweiterte Tests (Edge Cases & UI Logik) ---

    it('i18n: verwendet die richtigen Übersetzungs-Keys für statische Texte', async () => {
        ;(appApi.list as any).mockResolvedValue({ data: [] })
        const wrapper = mountComponent()
        await flushPromises()

        expect(wrapper.text()).toContain('AppsView.title')
        expect(wrapper.text()).toContain('AppsView.subtitle')
        expect(wrapper.text()).toContain('AppsView.addApp')
    })

    it('Router: der "Hinzufügen" Button verweist auf die richtige Route (apps.create)', async () => {
        ;(appApi.list as any).mockResolvedValue({ data: [] })
        const wrapper = mountComponent()
        await flushPromises()

        const addLink = wrapper.find('a.router-link-stub')
        expect(addLink.attributes('href')).toBe('apps.create')
    })

    it('zeigt statt eines Icons die Überschrift und den ersten Absatz der Beschreibung als Klartext', async () => {
        const mockApps = [{
            appId: 'a1',
            name: 'GitLab-CE',
            description: [
                '# GitLab CE – Git pro Team',
                '',
                'Deployt **pro Team** eine Instanz.',
                '',
                '## Details',
                '',
                'Nicht auf der Karte.',
            ].join('\n'),
        }]
        ;(appApi.list as any).mockResolvedValue({ data: mockApps })

        const wrapper = mountComponent()
        await flushPromises()

        const card = wrapper.get('[data-testid="app-card"]')
        expect(card.find('svg').exists()).toBe(true) // only the chevron
        expect(card.findAll('svg')).toHaveLength(1)
        expect(card.text()).toContain('GitLab CE – Git pro Team')
        expect(card.text()).toContain('Deployt pro Team eine Instanz.')
        expect(card.text()).not.toContain('**')
        expect(card.text()).not.toContain('Nicht auf der Karte.')
    })

    it('sagt es, wenn eine App keine Beschreibung hat', async () => {
        ;(appApi.list as any).mockResolvedValue({ data: [{ appId: 'a1', name: 'Leer', description: '' }] })

        const wrapper = mountComponent()
        await flushPromises()

        expect(wrapper.get('[data-testid="app-card"]').text()).toContain('AppsView.noDescription')
    })

    it('zeigt einen Lade-Text/Spinner an, während die Daten geladen werden', async () => {
        let resolveApi: any
        ;(appApi.list as any).mockReturnValue(new Promise(resolve => {
            resolveApi = resolve
        }))

        const wrapper = mountComponent()
        await nextTick()

        expect(wrapper.text()).toContain('AppsView.loading')
        resolveApi({ data: [] })
    })
})