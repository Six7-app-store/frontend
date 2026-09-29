import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'

import AppsDetailView from '@/views/AppsDetailView.vue'
import { ROUTE_NAMES } from '@/router/route-names'
import de from '@/i18n/locales/de'

// ---------------------------------------------------------
// 1. Mocks & Setup
// ---------------------------------------------------------

// Router & Route
const mockPush = vi.fn()
const mockBack = vi.fn()
vi.mock('vue-router', () => ({
    useRouter: () => ({ push: mockPush, back: mockBack }),
    useRoute: () => ({ params: { id: 'app-123' } })
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
        update: vi.fn(),
        listVersionApprovals: vi.fn(),
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

    beforeEach(() => {
        vi.clearAllMocks()
        ;(appApi.listVersionApprovals as any).mockResolvedValue({ data: [] })
        // Standard-Antwort der API
        ;(appApi.getById as any).mockResolvedValue({
            data: {
                id: 'app-123',
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
            data: { id: 'app-123', name: 'Leere App', versions: [] }
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

    // --- 3. Löschen (Modal & API) ---

    it('zeigt den Lösch-Button an, wenn der Nutzer der Besitzer ist, und öffnet das Modal', async () => {
        const wrapper = mountComponent()
        await flushPromises()

        const deleteButton = wrapper.findAll('button').find(b => b.text().includes('AppsDetailView.deleteApp'))!
        expect(deleteButton.exists()).toBe(true)

        await deleteButton.trigger('click')
        await nextTick()

        const modal = wrapper.find('.modal')
        expect(modal.exists()).toBe(true)
        expect(modal.text()).toContain('AppsDetailView.confirmDeleteTitle')
    })

    it('rendert den App-Namen im Lösch-Modal als Text, nicht als HTML', async () => {
        const evilName = '<img src=x onerror="alert(1)">'
        ;(appApi.getById as any).mockResolvedValue({
            data: { id: 'app-123', name: evilName, description: '', userId: 'user-1', versions: [] }
        })
        const wrapper = mountComponent()
        await flushPromises()

        const deleteButton = wrapper.findAll('button').find(b => b.text().includes('AppsDetailView.deleteApp'))!
        await deleteButton.trigger('click')
        await nextTick()

        const modal = wrapper.find('.modal')
        expect(modal.find('img').exists()).toBe(false)
        expect(modal.find('strong').text()).toBe(evilName)
    })

    it('löscht die App erfolgreich nach Bestätigung im Modal', async () => {
        ;(appApi.delete as any).mockResolvedValue({})

        const wrapper = mountComponent()
        await flushPromises()

        const deleteButton = wrapper.findAll('button').find(b => b.text().includes('AppsDetailView.deleteApp'))!
        await deleteButton.trigger('click')
        await nextTick()

        const confirmBtn = wrapper.findAll('.modal button').find(b => b.text().includes('AppsDetailView.confirmButton'))!
        await confirmBtn.trigger('click')
        await flushPromises()

        expect(appApi.delete).toHaveBeenCalledWith('app-123')
        expect(mockToastSuccess).toHaveBeenCalledWith('AppsDetailView.deleteSuccessToast')
        expect(mockPush).toHaveBeenCalledWith({ name: 'apps' })
    })

    // --- 4. Navigation ---

    it('navigiert zurück, wenn der Zurück-Button geklickt wird', async () => {
        const wrapper = mountComponent()
        await flushPromises()

        const backButton = wrapper.findAll('button').find(b => b.text().includes('AppsDetailView.backToOverview'))!
        await backButton.trigger('click')

        expect(mockBack).toHaveBeenCalledTimes(1)
    })

    describe('Version einreichen', () => {
        const openSubmitDialog = async () => {
            const wrapper = mountComponent()
            await flushPromises()
            await wrapper.findAll('button').find(b => b.text().includes('AppsDetailView.tabStore'))!.trigger('click')
            await wrapper.findAll('button').find(b => b.text().includes('AppsDetailView.submitButton'))!.trigger('click')
            return wrapper
        }
        const submitButton = (wrapper: ReturnType<typeof mountComponent>) =>
            wrapper.findAll('button').find(b => b.text().includes('AppsDetailView.submitModal.submit'))!

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

    it('schaltet die Sichtbarkeit im Store-Tab um', async () => {
        ;(appApi.getById as any).mockResolvedValue({
            data: { appId: 'app-123', name: 'Test App', userId: 'user-1', is_private: false, versions: ['v1.0'] },
        })
        ;(appApi.update as any).mockResolvedValue({ data: {} })
        const wrapper = mountComponent()
        await flushPromises()
        await wrapper.findAll('button').find(b => b.text().includes('AppsDetailView.tabStore'))!.trigger('click')

        const toggle = (w: { findAll: (s: string) => any[] }) =>
      w.findAll('button').find((b: any) => b.find('.toggle-knob').exists())!
        await toggle(wrapper).trigger('click')
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
            await wrapper.findAll('button').find(b => b.text().includes('AppsDetailView.editApp'))!.trigger('click')
            return wrapper
        }
        const save = async (wrapper: ReturnType<typeof mountComponent>) => {
            await wrapper.findAll('button').find(b => b.text().includes('AppsDetailView.editModal.saveButton'))!.trigger('click')
            await flushPromises()
        }
        const chooseFile = async (wrapper: ReturnType<typeof mountComponent>, file: File) => {
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
            await wrapper.findAll('button').find(b => b.text().includes('AppsDetailView.editModal.imageRemove'))!.trigger('click')

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
})
