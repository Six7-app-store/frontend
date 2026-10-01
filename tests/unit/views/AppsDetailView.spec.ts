import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises, enableAutoUnmount } from '@vue/test-utils'
import { nextTick, reactive } from 'vue'

import AppsDetailView from '@/views/AppsDetailView.vue'
import { ROUTE_NAMES } from '@/router/route-names'
import de from '@/i18n/locales/de'

// ---------------------------------------------------------
// 1. Mocks & Setup
// ---------------------------------------------------------

// Router & Route: ``replace`` changes the tab in the route, as the real router would.
const mockRoute = reactive({ params: { id: 'app-123' } as Record<string, string> })
const mockPush = vi.fn()
const mockBack = vi.fn()
const mockReplace = vi.fn((location: { params: Record<string, string> }) => {
    mockRoute.params = { ...location.params }
})
vi.mock('vue-router', () => ({
    useRouter: () => ({ push: mockPush, back: mockBack, replace: mockReplace }),
    useRoute: () => mockRoute
}))

// Echtes vue-i18n nur für die ``<i18n-t>``-Komponente im Template; ``useI18n``
// bleibt unten gemockt.
const { createI18n } = await vi.importActual<typeof import('vue-i18n')>('vue-i18n')

// i18n
vi.mock('vue-i18n', () => ({
    useI18n: () => ({ t: (key: string) => key })
}))

// Toast
const mockToastError = vi.fn()
const mockToastSuccess = vi.fn()
const mockToastWarning = vi.fn()
vi.mock('@/composables/useToast', () => ({
    useToast: () => ({ error: mockToastError, success: mockToastSuccess, warning: mockToastWarning })
}))

// API
vi.mock('@/api/app.api', () => ({
    appApi: {
        getById: vi.fn(),
        delete: vi.fn(),
        submitVersion: vi.fn(),
        withdrawVersion: vi.fn(),
        update: vi.fn(),
        listVersionApprovals: vi.fn(),
        getVariables: vi.fn(),
    }
}))
import { appApi } from '@/api/app.api'

// Stores (Pinia) simulieren
const mockDeploymentReset = vi.fn()
const mockDeploymentDraft = { appId: '', releaseTag: '' }

vi.mock('@/stores/deployment.store', () => ({
    useDeploymentStore: () => ({
        resetDraft: mockDeploymentReset,
        draft: mockDeploymentDraft
    })
}))

vi.mock('@/stores/openstack-credentials.store', () => ({
    useOpenStackCredentialsStore: () => ({
        isResolved: true,
        hasCredential: true
    })
}))

vi.mock('@/stores/auth.store', () => ({
    useAuthStore: () => ({
        userId: 'user-1'
    })
}))

// ---------------------------------------------------------
// 2. Die Tests
// ---------------------------------------------------------

describe('AppsDetailView.vue', () => {
    // Every view watches the shared route; a view left mounted would redirect the next test's.
    enableAutoUnmount(afterEach)

    beforeEach(() => {
        vi.clearAllMocks()
        mockRoute.params = { id: 'app-123' }
        ;(appApi.listVersionApprovals as any).mockResolvedValue({ data: [] })
        ;(appApi.getVariables as any).mockResolvedValue({ data: [] })
        // Standard-Antwort der API
        ;(appApi.getById as any).mockResolvedValue({
            data: {
                appId: 'app-123',
                name: 'Test App',
                description: 'Detail Beschreibung',
                userId: 'user-1',
                versions: ['v1.0', 'v2.0']
            }
        })
    })

    const mountComponent = () => {
        return mount(AppsDetailView, {
            global: {
                plugins: [createI18n({ legacy: false, locale: 'de', messages: { de } })],
                mocks: { $t: (msg: string) => msg },
                stubs: {
                    BaseButton: { template: '<button><slot /></button>' },
                    Modal: {
                        props: ['show'],
                        template: '<div v-if="$props.show" class="modal"><slot name="title" /><slot /><slot name="body" /><slot name="footer" /></div>'
                    },
                    RouterLink: true,
                    MarkdownRenderer: {
                        props: ['source'],
                        template: '<div>{{ source }}</div>'
                    }
                }
            }
        })
    }

    type Wrapper = ReturnType<typeof mountComponent>
    const tabButton = (wrapper: Wrapper, key: string) =>
        wrapper.findAll('[role="tab"]').find(b => b.text().includes(`AppsDetailView.tabs.${key}`))
    const openTab = async (wrapper: Wrapper, key: string) => {
        await tabButton(wrapper, key)!.trigger('click')
        await flushPromises()
    }
    const buttonWith = (wrapper: Wrapper, text: string) =>
        wrapper.findAll('button').find(b => b.text().includes(text))!

    // --- 1. Laden und Anzeigen ---

    it('lädt die App-Details anhand der ID aus der URL', async () => {
        const wrapper = mountComponent()
        await flushPromises()

        expect(appApi.getById).toHaveBeenCalledWith('app-123', false)
        expect(wrapper.text()).toContain('Test App')
        expect(wrapper.text()).toContain('Detail Beschreibung')
    })

    it('leitet zur Liste um und zeigt einen Fehler, wenn die App nicht gefunden wird', async () => {
        ;(appApi.getById as any).mockRejectedValue(new Error('Not found'))

        mountComponent()
        await flushPromises()

        expect(mockToastError).toHaveBeenCalledWith('AppsDetailView.toasts.loadError')
        expect(mockPush).toHaveBeenCalledWith({ name: ROUTE_NAMES.apps })
    })

    it('wählt automatisch die erste Version aus, wenn Versionen vorhanden sind', async () => {
        const wrapper = mountComponent()
        await flushPromises()

        const select = wrapper.find('select')
        expect(select.element.value).toBe('v1.0')
    })

    // --- 2. Deployment (Bereitstellung) ---

    it('speichert die Auswahl im Deployment-Store und navigiert zur Config', async () => {
        const wrapper = mountComponent()
        await flushPromises()

        const deployButton = wrapper.findAll('button').find(b => b.text().includes('AppsDetailView.deployButton'))!
        await deployButton.trigger('click')

        expect(mockDeploymentReset).toHaveBeenCalled()
        expect(mockDeploymentDraft.appId).toBe('app-123')
        expect(mockDeploymentDraft.releaseTag).toBe('v1.0')
        expect(mockPush).toHaveBeenCalledWith({ name: 'deployment.config' })
    })

    it('deaktiviert den Deploy-Button und warnt (Fallback), wenn keine Version ausgewählt ist', async () => {
        // API liefert App OHNE Versionen
        ;(appApi.getById as any).mockResolvedValue({
            data: { appId: 'app-123', name: 'Leere App', versions: [] }
        })

        const wrapper = mountComponent()
        await flushPromises()

        const deployButton = wrapper.findAll('button').find(b => b.text().includes('AppsDetailView.deployButton'))!

        // 1. UI-Prüfung: Der Button muss für den Nutzer gesperrt (disabled) sein
        expect(deployButton.attributes('disabled')).toBeDefined()

        // 2. Logik-Prüfung: Wir rufen die interne Funktion direkt auf, um das Sicherheitsnetz zu testen
        ;(wrapper.vm as any).handleDeploy()

        expect(mockToastWarning).toHaveBeenCalledWith('AppsDetailView.toasts.selectVersionFirst')
        expect(mockPush).not.toHaveBeenCalled()
    })

    // --- 3. Reiter und URL ---

    describe('Reiter', () => {
        it('zeigt dem Besitzer alle Reiter mit Inhalt und markiert die Übersicht', async () => {
            const wrapper = mountComponent()
            await flushPromises()

            const labels = wrapper.findAll('[role="tab"]').map(b => b.text())
            expect(labels).toEqual([
                'AppsDetailView.tabs.overview',
                'AppsDetailView.tabs.docs',
                'AppsDetailView.tabs.versions',
                'AppsDetailView.tabs.settings',
            ])
            expect(tabButton(wrapper, 'overview')!.attributes('aria-selected')).toBe('true')
            expect(wrapper.get('[role="tabpanel"]').attributes('aria-labelledby')).toBe('app-detail-tab-overview')
        })

        it('wechselt den Reiter über die URL', async () => {
            const wrapper = mountComponent()
            await flushPromises()

            await openTab(wrapper, 'docs')

            expect(mockReplace).toHaveBeenCalledWith({ name: ROUTE_NAMES.appsDetail, params: { id: 'app-123', tab: 'docs' } })
            expect(tabButton(wrapper, 'docs')!.attributes('aria-selected')).toBe('true')
        })

        it('öffnet den Reiter aus der URL direkt (Reload, geteilter Link)', async () => {
            mockRoute.params = { id: 'app-123', tab: 'docs' }
            const wrapper = mountComponent()
            await flushPromises()

            expect(tabButton(wrapper, 'docs')!.attributes('aria-selected')).toBe('true')
            expect(wrapper.get('[role="tabpanel"]').text()).toContain('Detail Beschreibung')
            expect(mockReplace).not.toHaveBeenCalled()
        })

        it('führt die Übersicht ohne eigenes Segment', async () => {
            mockRoute.params = { id: 'app-123', tab: 'docs' }
            const wrapper = mountComponent()
            await flushPromises()

            await openTab(wrapper, 'overview')

            expect(mockReplace).toHaveBeenCalledWith({ name: ROUTE_NAMES.appsDetail, params: { id: 'app-123' } })
        })

        it('verweist aus der Übersicht nur auf vorhandene Reiter', async () => {
            const wrapper = mountComponent()
            await flushPromises()

            // One sentence with a link: documentation yes, configuration (no variables) no.
            const teaser = wrapper.get('[data-testid="overview-teaser"]')
            expect(teaser.findAll('router-link-stub')).toHaveLength(1)
            expect(teaser.text()).toContain('Ausführliche Informationen')
        })
    })

    describe('App ohne Beschreibung', () => {
        beforeEach(() => {
            ;(appApi.getById as any).mockResolvedValue({
                data: { appId: 'app-123', name: 'Ohne Text', description: '   ', userId: 'user-1', versions: ['v1.0'] },
            })
        })

        it('zeigt den Leerzustand und keinen Reiter Dokumentation', async () => {
            const wrapper = mountComponent()
            await flushPromises()

            expect(wrapper.text()).toContain('AppsDetailView.noDescription')
            expect(tabButton(wrapper, 'docs')).toBeUndefined()
            expect(wrapper.find('[data-testid="overview-teaser"]').exists()).toBe(false)
        })

        it('leitet einen Link auf die Dokumentation zur Übersicht um', async () => {
            mockRoute.params = { id: 'app-123', tab: 'docs' }
            const wrapper = mountComponent()
            await flushPromises()

            expect(mockReplace).toHaveBeenCalledWith({ name: ROUTE_NAMES.appsDetail, params: { id: 'app-123' } })
            expect(tabButton(wrapper, 'overview')!.attributes('aria-selected')).toBe('true')
        })
    })

    describe('Konfiguration', () => {
        const variables = [
            { name: 'network_uuid', type: 'string', description: 'Hauptnetzwerk @openstack:network:id', required: false, default: 'abc', source: 'terraform' },
            { name: 'assignment_files', type: 'string', description: 'Aufgaben', required: true, source: 'terraform' },
        ]

        it('lädt die Variablen der aktuellen Version im Hintergrund', async () => {
            mountComponent()
            await flushPromises()

            expect(appApi.getVariables).toHaveBeenCalledWith('app-123', 'v1.0')
        })

        it('zeigt die Variablen ohne Marker, mit Pflicht und vorhandenem Default', async () => {
            ;(appApi.getVariables as any).mockResolvedValue({ data: variables })
            const wrapper = mountComponent()
            await flushPromises()

            await openTab(wrapper, 'config')

            const panel = wrapper.get('[role="tabpanel"]')
            expect(panel.findAll('[data-testid="config-variable"]').map(c => c.text())).toEqual(['network_uuid', 'assignment_files'])
            expect(panel.text()).toContain('Hauptnetzwerk')
            expect(panel.text()).not.toContain('@openstack')
            expect(panel.text()).toContain('AppsDetailView.config.defaultPresent')
            expect(panel.text()).toContain('AppsDetailView.yes')
        })

        it('blendet den Reiter ohne Variablen aus und leitet den Link um', async () => {
            mockRoute.params = { id: 'app-123', tab: 'config' }
            const wrapper = mountComponent()
            await flushPromises()

            expect(tabButton(wrapper, 'config')).toBeUndefined()
            expect(mockReplace).toHaveBeenCalledWith({ name: ROUTE_NAMES.appsDetail, params: { id: 'app-123' } })
            expect(mockToastError).not.toHaveBeenCalled()
        })

        it('wartet bei einem direkten Link, bis die Variablen da sind', async () => {
            mockRoute.params = { id: 'app-123', tab: 'config' }
            ;(appApi.getVariables as any).mockReturnValue(new Promise(() => {}))
            const wrapper = mountComponent()
            await flushPromises()

            expect(tabButton(wrapper, 'config')!.attributes('aria-selected')).toBe('true')
            expect(wrapper.text()).toContain('AppsDetailView.config.loading')
            expect(mockReplace).not.toHaveBeenCalled()
        })

        it('meldet einen Ladefehler, wenn die Konfiguration verlangt war', async () => {
            mockRoute.params = { id: 'app-123', tab: 'config' }
            ;(appApi.getVariables as any).mockRejectedValue(new Error('git'))
            mountComponent()
            await flushPromises()

            expect(mockToastError).toHaveBeenCalledWith('AppsDetailView.toasts.variablesError')
            expect(mockReplace).toHaveBeenCalledWith({ name: ROUTE_NAMES.appsDetail, params: { id: 'app-123' } })
        })

        it('fragt ohne Versionen keine Variablen an', async () => {
            ;(appApi.getById as any).mockResolvedValue({
                data: { appId: 'app-123', name: 'Leer', userId: 'user-1', versions: [] },
            })
            const wrapper = mountComponent()
            await flushPromises()

            expect(appApi.getVariables).not.toHaveBeenCalled()
            expect(tabButton(wrapper, 'versions')).toBeUndefined()
        })
    })

    // --- 4. Einstellungen: Löschen, Sichtbarkeit, Bearbeiten ---

    const openDeleteDialog = async (wrapper: Wrapper) => {
        await openTab(wrapper, 'settings')
        await buttonWith(wrapper, 'AppsDetailView.deleteZoneButton').trigger('click')
        await nextTick()
    }

    it('bietet dem Besitzer das Löschen in den Einstellungen an und öffnet den Dialog', async () => {
        const wrapper = mountComponent()
        await flushPromises()

        await openDeleteDialog(wrapper)

        const modal = wrapper.find('.modal')
        expect(modal.exists()).toBe(true)
        expect(modal.text()).toContain('AppsDetailView.confirmDeleteTitle')
        expect(appApi.delete).not.toHaveBeenCalled()
    })

    it('hat im Kopf keine Aktionen mehr, nur den Status', async () => {
        const wrapper = mountComponent()
        await flushPromises()

        expect(wrapper.find('button[aria-haspopup]').exists()).toBe(false)
        expect(wrapper.get('[data-testid="app-status"]').text()).toContain('AppVersionStatusBadge.new')
    })

    it('rendert den App-Namen im Lösch-Modal als Text, nicht als HTML', async () => {
        const evilName = '<img src=x onerror="alert(1)">'
        ;(appApi.getById as any).mockResolvedValue({
            data: { appId: 'app-123', name: evilName, description: '', userId: 'user-1', versions: [] }
        })
        const wrapper = mountComponent()
        await flushPromises()

        await openDeleteDialog(wrapper)

        const modal = wrapper.find('.modal')
        expect(modal.find('img').exists()).toBe(false)
        expect(modal.find('strong').text()).toBe(evilName)
    })

    it('löscht die App erfolgreich nach Bestätigung im Modal', async () => {
        ;(appApi.delete as any).mockResolvedValue({})

        const wrapper = mountComponent()
        await flushPromises()

        await openDeleteDialog(wrapper)

        const confirmBtn = wrapper.findAll('.modal button').find(b => b.text().includes('AppsDetailView.confirmButton'))!
        await confirmBtn.trigger('click')
        await flushPromises()

        expect(appApi.delete).toHaveBeenCalledWith('app-123')
        expect(mockToastSuccess).toHaveBeenCalledWith('AppsDetailView.deleteSuccessToast')
        expect(mockPush).toHaveBeenCalledWith({ name: 'apps' })
    })

    it('schaltet die Sichtbarkeit in den Einstellungen um', async () => {
        ;(appApi.getById as any).mockResolvedValue({
            data: { appId: 'app-123', name: 'Test App', userId: 'user-1', is_private: false, versions: ['v1.0'] },
        })
        ;(appApi.update as any).mockResolvedValue({ data: {} })
        const wrapper = mountComponent()
        await flushPromises()
        await openTab(wrapper, 'settings')

        const toggle = wrapper.findAll('button').find(b => b.find('.toggle-knob').exists())!
        await toggle.trigger('click')
        await flushPromises()

        expect(appApi.update).toHaveBeenCalledWith('app-123', { is_private: true })
        expect(mockToastSuccess).toHaveBeenCalledWith('AppsDetailView.toasts.setPrivate')
        expect(wrapper.text()).toContain('AppsDetailView.visibilityPrivate')
    })

    describe('App bearbeiten: Bild', () => {
        beforeEach(() => {
            global.URL.createObjectURL = vi.fn(() => 'blob:mocked-url')
            global.URL.revokeObjectURL = vi.fn()
            ;(appApi.getById as any).mockResolvedValue({
                data: { appId: 'app-123', name: 'Test App', description: '', userId: 'user-1', image: 'data:image/png;base64,ALT', versions: ['v1.0'] },
            })
            ;(appApi.update as any).mockResolvedValue({ data: {} })
        })

        const openEditDialog = async () => {
            const wrapper = mountComponent()
            await flushPromises()
            await openTab(wrapper, 'settings')
            await buttonWith(wrapper, 'AppsDetailView.editApp').trigger('click')
            return wrapper
        }
        const save = async (wrapper: Wrapper) => {
            await buttonWith(wrapper, 'AppsDetailView.editModal.saveButton').trigger('click')
            await flushPromises()
        }
        const chooseFile = async (wrapper: Wrapper, file: File) => {
            const input = wrapper.find('input[type="file"]')
            Object.defineProperty(input.element, 'files', { value: [file], configurable: true })
            await input.trigger('change')
        }

        it('ruft ohne Änderung nichts auf', async () => {
            const wrapper = await openEditDialog()
            await save(wrapper)
            expect(appApi.update).not.toHaveBeenCalled()
        })

        it('ersetzt das Bild durch eine Data-URL', async () => {
            const wrapper = await openEditDialog()
            await chooseFile(wrapper, new File(['neu'], 'neu.png', { type: 'image/png' }))
            expect(wrapper.text()).toContain('neu.png')

            await save(wrapper)
            // The file is read with a FileReader, which resolves outside the promise queue.
            await vi.waitFor(() => expect(appApi.update).toHaveBeenCalled())
            expect(appApi.update).toHaveBeenCalledWith('app-123', { image: expect.stringMatching(/^data:image\/png;base64,/) })
        })

        it('entfernt das Bild mit einem leeren String', async () => {
            const wrapper = await openEditDialog()
            await buttonWith(wrapper, 'AppsDetailView.editModal.imageRemove').trigger('click')
            // Removing asks first.
            expect(wrapper.text()).toContain('AppsDetailView.editModal.removeConfirmTitle')
            await wrapper.get('[data-testid="confirm-remove-image"]').trigger('click')

            await save(wrapper)
            expect(appApi.update).toHaveBeenCalledWith('app-123', { image: '' })
        })

        it('lehnt Nicht-Bilder mit einem Hinweis ab', async () => {
            const wrapper = await openEditDialog()
            await chooseFile(wrapper, new File(['x'], 'notes.txt', { type: 'text/plain' }))

            expect(mockToastError).toHaveBeenCalledWith('image.onlyImages')
            await save(wrapper)
            expect(appApi.update).not.toHaveBeenCalled()
        })
    })

    it('sendet beim Bearbeiten nur geänderte Felder', async () => {
        ;(appApi.update as any).mockResolvedValue({ data: { name: 'Neu' } })
        const wrapper = mountComponent()
        await flushPromises()
        await openTab(wrapper, 'settings')
        await buttonWith(wrapper, 'AppsDetailView.editApp').trigger('click')

        await wrapper.find('.modal input[type="text"]').setValue('  Neu  ')
        await buttonWith(wrapper, 'AppsDetailView.editModal.saveButton').trigger('click')
        await flushPromises()

        expect(appApi.update).toHaveBeenCalledWith('app-123', { name: 'Neu' })
        expect(mockToastSuccess).toHaveBeenCalledWith('AppsDetailView.toasts.editSuccess')
        expect(wrapper.find('h1').text()).toBe('Neu')
    })

    // --- 5. Versionen ---

    describe('Version einreichen', () => {
        const openSubmitDialog = async () => {
            const wrapper = mountComponent()
            await flushPromises()
            await openTab(wrapper, 'versions')
            await buttonWith(wrapper, 'AppsDetailView.submitButton').trigger('click')
            return wrapper
        }
        const submitButton = (wrapper: Wrapper) => buttonWith(wrapper, 'AppsDetailView.submitModal.submit')

        it('reicht die Version mit getrimmter Notiz ein und schließt den Dialog', async () => {
            ;(appApi.submitVersion as any).mockResolvedValue({})
            const wrapper = await openSubmitDialog()

            await wrapper.find('textarea').setValue('  bitte prüfen  ')
            await submitButton(wrapper).trigger('click')
            await flushPromises()

            expect(appApi.submitVersion).toHaveBeenCalledWith('app-123', 'v1.0', undefined, 'bitte prüfen')
            expect(mockToastSuccess).toHaveBeenCalledWith('AppsDetailView.toasts.submitSuccess')
            expect(wrapper.find('textarea').exists()).toBe(false)
        })

        it('reicht ohne Notiz ein (Notiz ist optional)', async () => {
            ;(appApi.submitVersion as any).mockResolvedValue({})
            const wrapper = await openSubmitDialog()

            await submitButton(wrapper).trigger('click')
            await flushPromises()

            expect(appApi.submitVersion).toHaveBeenCalledWith('app-123', 'v1.0', undefined, undefined)
        })

        it('zeigt Marker-Fehler einer 422 im offenen Dialog', async () => {
            ;(appApi.submitVersion as any).mockRejectedValue({
                response: { status: 422, data: { detail: { marker_errors: [
                    { variable: 'flavor', code: 'unknown_type', message: 'Unbekannter Typ', location: 'variables.tf:3' },
                ] } } },
            })
            const wrapper = await openSubmitDialog()

            await submitButton(wrapper).trigger('click')
            await flushPromises()

            expect(wrapper.find('textarea').exists()).toBe(true)
            expect(wrapper.text()).toContain('flavor')
            expect(wrapper.text()).toContain('Unbekannter Typ')
            expect(wrapper.text()).toContain('variables.tf:3')
            expect(mockToastError).not.toHaveBeenCalled()
        })
    })

    describe('Versionen-Reiter', () => {
        const approval = (version_tag: string, status: string, extra = {}) =>
            ({ version_tag, status, created_at: '2026-01-02T00:00:00Z', rejection_reason: null, ...extra })

        const openVersionsTab = async () => {
            const wrapper = mountComponent()
            await flushPromises()
            await openTab(wrapper, 'versions')
            return wrapper
        }

        it('mahnt eine öffentliche App ohne Einreichung an, auch per Punkt am Reiter', async () => {
            const wrapper = await openVersionsTab()
            expect(wrapper.text()).toContain('AppsDetailView.bannerNoSubmission')
            expect(wrapper.text()).not.toContain('AppsDetailView.bannerPending')
            expect(tabButton(wrapper, 'versions')!.find('[data-testid="versions-hint"]').exists()).toBe(true)
        })

        it('meldet eine wartende Einreichung und bietet das Zurückziehen an', async () => {
            ;(appApi.listVersionApprovals as any).mockResolvedValue({ data: [approval('v1.0', 'pending')] })
            ;(appApi.withdrawVersion as any).mockResolvedValue({})
            const wrapper = await openVersionsTab()
            expect(wrapper.text()).toContain('AppsDetailView.bannerPending')
            expect(wrapper.get('[data-testid="app-status"]').text()).toContain('AppVersionStatusBadge.pending')

            await buttonWith(wrapper, 'AppsDetailView.withdrawButton').trigger('click')
            await nextTick()
            // Withdrawing is confirmed first.
            expect(appApi.withdrawVersion).not.toHaveBeenCalled()
            const dialog = wrapper.find('.modal')
            expect(dialog.text()).toContain('AppsDetailView.withdrawConfirmTitle')
            await dialog.findAll('button').find(b => b.text().includes('AppsDetailView.withdrawButton'))!.trigger('click')
            await flushPromises()

            expect(appApi.withdrawVersion).toHaveBeenCalledWith('app-123', 'v1.0')
            expect(mockToastSuccess).toHaveBeenCalledWith('AppsDetailView.toasts.withdrawSuccess')
            // Die Freigaben werden danach neu geladen.
            expect(appApi.listVersionApprovals).toHaveBeenCalledTimes(2)
        })

        it('zeigt bei einer abgelehnten Version den Grund und das erneute Einreichen', async () => {
            ;(appApi.listVersionApprovals as any).mockResolvedValue({
                data: [approval('v1.0', 'rejected', { rejection_reason: 'Zu groß' })],
            })
            const wrapper = await openVersionsTab()

            expect(wrapper.text()).toContain('Zu groß')
            expect(wrapper.text()).toContain('AppsDetailView.resubmitButton')
        })

        it('zeigt keinen Banner mehr, sobald eine Version freigegeben ist', async () => {
            ;(appApi.listVersionApprovals as any).mockResolvedValue({
                data: [approval('v1.0', 'approved'), approval('v2.0', 'pending')],
            })
            const wrapper = await openVersionsTab()
            expect(wrapper.text()).not.toContain('AppsDetailView.bannerPending')
            expect(wrapper.text()).not.toContain('AppsDetailView.bannerNoSubmission')
            expect(wrapper.get('[data-testid="app-status"]').text()).toContain('AppVersionStatusBadge.published')
        })

        it('warnt bei einer doppelten Einreichung (409)', async () => {
            ;(appApi.submitVersion as any).mockRejectedValue({ response: { status: 409 } })
            const wrapper = await openVersionsTab()
            await buttonWith(wrapper, 'AppsDetailView.submitButton').trigger('click')
            await buttonWith(wrapper, 'AppsDetailView.submitModal.submit').trigger('click')
            await flushPromises()

            expect(mockToastWarning).toHaveBeenCalledWith('AppsDetailView.toasts.submitDuplicate')
        })

        it('zeigt für private Apps einen Hinweis und keine Prüf-Aktionen', async () => {
            ;(appApi.getById as any).mockResolvedValue({
                data: { appId: 'app-123', name: 'Test App', userId: 'user-1', is_private: true, versions: ['v1.0'] },
            })
            const wrapper = await openVersionsTab()
            expect(wrapper.text()).toContain('AppsDetailView.privateAppStoreHint')
            expect(wrapper.text()).not.toContain('AppsDetailView.submitButton')
            expect(wrapper.text()).toContain('v1.0')
        })

        it('zeigt Typ und Commit der Versionen, wo vorhanden', async () => {
            ;(appApi.getById as any).mockResolvedValue({
                data: {
                    appId: 'app-123', name: 'Test App', userId: 'user-1',
                    versions: [{ version: 'v3', type: 'tag', commit: 'abc12345ffff' }, 'v2'],
                },
            })
            const wrapper = await openVersionsTab()

            const details = wrapper.get('[data-testid="version-details"]').text()
            expect(details).toContain('v3 AppsDetailView.versionType')
            expect(details).toContain('abc12345')
            expect(details).not.toContain('abc12345ffff')
            expect(details).not.toContain('v2')
        })
    })

    describe('Ohne Bearbeitungsrecht', () => {
        beforeEach(() => {
            ;(appApi.getById as any).mockResolvedValue({
                data: { appId: 'app-123', name: 'Test App', description: 'Text', userId: 'someone-else', versions: ['v1.0'] },
            })
        })

        it('gibt es keine Einstellungen, keine Prüfspalten und keine Freigaben', async () => {
            const wrapper = mountComponent()
            await flushPromises()

            expect(tabButton(wrapper, 'settings')).toBeUndefined()
            expect(wrapper.get('[data-testid="app-status"]').text()).toContain('AppVersionStatusBadge.published')
            expect(appApi.listVersionApprovals).not.toHaveBeenCalled()

            await openTab(wrapper, 'versions')
            expect(wrapper.find('[data-testid="versions-hint"]').exists()).toBe(false)
            expect(wrapper.text()).not.toContain('AppsDetailView.versionTableStatus')
            expect(wrapper.text()).not.toContain('AppsDetailView.submitButton')
        })

        it('leitet einen Link auf die Einstellungen zur Übersicht um', async () => {
            mockRoute.params = { id: 'app-123', tab: 'settings' }
            const wrapper = mountComponent()
            await flushPromises()

            expect(mockReplace).toHaveBeenCalledWith({ name: ROUTE_NAMES.appsDetail, params: { id: 'app-123' } })
            expect(wrapper.text()).not.toContain('AppsDetailView.deleteZoneButton')
        })
    })
})
