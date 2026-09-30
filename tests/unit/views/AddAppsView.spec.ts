import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

import AddAppsView from '@/views/AddAppsView.vue'


// ---------------------------------------------------------
// 1. Abhängigkeiten (Dependencies) "mocken"
// ---------------------------------------------------------

const mockPush = vi.fn()
vi.mock('vue-router', () => ({
    useRouter: () => ({ push: mockPush })
}))

vi.mock('vue-i18n', () => ({
    useI18n: () => ({
        t: (key: string, vars?: any) => vars ? `${key}_${JSON.stringify(vars)}` : key,
        locale: 'de'
    })
}))

const mockToastError = vi.fn()
const mockToastSuccess = vi.fn()
vi.mock('@/composables/useToast', () => ({
    useToast: () => ({ error: mockToastError, success: mockToastSuccess })
}))

vi.mock('@/api/app.api', () => ({
    appApi: {
        create: vi.fn(),
        // Called on mount for the GitHub App hint; null = no App configured.
        getGithubApp: vi.fn(() => Promise.resolve({ data: { install_url: null } }))
    }
}))
import { appApi } from '@/api/app.api'

// Native Browser-Funktionen für Bilder simulieren
global.URL.createObjectURL = vi.fn(() => 'blob:mocked-url')
global.URL.revokeObjectURL = vi.fn()

// ---------------------------------------------------------
// 2. Die Tests
// ---------------------------------------------------------

describe('AddAppsView.vue', () => {

    beforeEach(() => {
        vi.clearAllMocks()
    })

    const mountComponent = () => {
        return mount(AddAppsView, {
            global: {
                mocks: {
                    $t: (msg: string) => msg
                },
                stubs: {
                    // MarkdownEditor exposes a textarea internally, but the
                    // component's heavy lifting (toolbar / preview pane) isn't
                    // what these tests care about — they just need a textarea
                    // bound to ``form.description``. Stub it down to that.
                    MarkdownEditor: {
                        props: ['modelValue', 'placeholder'],
                        emits: ['update:modelValue'],
                        template: `<textarea
                          :value="modelValue"
                          :placeholder="placeholder"
                          @input="$emit('update:modelValue', $event.target.value)"
                        />`
                    },
                    MarkdownRenderer: {
                        props: ['source'],
                        template: '<div>{{ source }}</div>'
                    },
                }
            }
        })
    }

    // --- 1. Formular-Validierungen ---

    it('zeigt einen Fehler, wenn Pflichtfelder (Name, Repo) fehlen', async () => {
        const wrapper = mountComponent()

        await wrapper.get('form').trigger('submit')

        expect(mockToastError).toHaveBeenCalledWith('AppsCreateView.messages.missingFields')
        expect(appApi.create).not.toHaveBeenCalled()
    })

    it('zeigt einen Fehler, wenn die Git-URL ein ungültiges Format hat', async () => {
        const wrapper = mountComponent()
        const textInputs = wrapper.findAll('input[type="text"]')

        await textInputs[0]!.setValue('Meine App')
        // Korrektur: Repo-URL ist nun Index 1, da Textarea die Description hält
        await textInputs[1]!.setValue('keine-echte-url')

        await wrapper.get('form').trigger('submit')

        expect(mockToastError).toHaveBeenCalledWith('AppsCreateView.messages.invalidUrl')
    })

    // --- 2. Dynamische Vorschau (Computed Properties) ---

    it('zeigt in der Vorschau die Karte, wie sie im Katalog erscheinen wird', async () => {
        const wrapper = mountComponent()
        const preview = () => wrapper.get('[data-testid="app-card"]')

        expect(preview().text()).toContain('AppsCreateView.preview.defaultName')
        expect(preview().text()).toContain('AppsCreateView.preview.defaultDesc')

        await wrapper.findAll('input[type="text"]')[0]!.setValue('Security Scanner')
        await wrapper.get('textarea').setValue(['# Scanner', '', 'Prüft **alles**.'].join('\n'))

        expect(preview().text()).toContain('Security Scanner')
        expect(preview().text()).toContain('Scanner')
        expect(preview().text()).toContain('Prüft alles.')
        // A preview is not a link.
        expect(preview().element.tagName).toBe('DIV')
    })

    it('stellt die Sichtbarkeit über den Umschalter um und blendet "alle Versionen einreichen" für private Apps aus', async () => {
        const wrapper = mountComponent()
        const privateButton = wrapper.findAll('button[aria-pressed]').find((b) => b.text().includes('AppsCreateView.form.visibilityPrivate'))!

        expect(wrapper.text()).toContain('AppsCreateView.form.submitAllLabel')
        await privateButton.trigger('click')

        expect(privateButton.attributes('aria-pressed')).toBe('true')
        expect(wrapper.text()).toContain('AppsCreateView.form.visibilityPrivateHint')
        expect(wrapper.text()).not.toContain('AppsCreateView.form.submitAllLabel')
    })

    it('lehnt Dateien ab, die keine Bilder sind', async () => {
        const wrapper = mountComponent()
        const fileInput = wrapper.find('input[type="file"]')

        const file = new File(['text content'], 'test.txt', { type: 'text/plain' })

        Object.defineProperty(fileInput.element, 'files', {
            value: [file]
        })
        await fileInput.trigger('change')

        expect(mockToastError).toHaveBeenCalledWith('image.onlyImages')
    })

    it('lehnt Bilder ab, die größer als 2MB sind', async () => {
        const wrapper = mountComponent()
        const fileInput = wrapper.find('input[type="file"]')

        const hugeFile = new File([''], 'huge.png', { type: 'image/png' })
        Object.defineProperty(hugeFile, 'size', { value: 3 * 1024 * 1024 })

        Object.defineProperty(fileInput.element, 'files', { value: [hugeFile] })
        await fileInput.trigger('change')

        expect(mockToastError).toHaveBeenCalledWith('image.tooLarge_{"size":2}')
    })

    it('akzeptiert gültige Bilder und zeigt eine Vorschau an', async () => {
        const wrapper = mountComponent()
        const fileInput = wrapper.find('input[type="file"]')

        const validFile = new File(['dummy content'], 'logo.png', { type: 'image/png' })
        Object.defineProperty(validFile, 'size', { value: 1024 })

        Object.defineProperty(fileInput.element, 'files', { value: [validFile] })
        await fileInput.trigger('change')

        const img = wrapper.find('img')
        expect(img.exists()).toBe(true)
        expect(img.attributes('src')).toBe('blob:mocked-url')
    })

    // --- 4. Erfolgreiches Speichern ---

    it('sendet die Daten erfolgreich an die API und navigiert zur Liste', async () => {
        const wrapper = mountComponent()
        const textInputs = wrapper.findAll('input[type="text"]')
        const textArea = wrapper.find('textarea')

        await textInputs[0]!.setValue('Super App')
        // Korrektur: Die Beschreibung in das korrekte textarea Feld schreiben
        await textArea.setValue('Eine Testbeschreibung')
        // Korrektur: Repo-URL ist Index 1
        await textInputs[1]!.setValue('https://github.com/user/repo')

        await wrapper.get('form').trigger('submit')

        await flushPromises()

        expect(appApi.create).toHaveBeenCalledTimes(1)
        expect(appApi.create).toHaveBeenCalledWith({
            name: 'Super App',
            description: 'Eine Testbeschreibung',
            git_link: 'https://github.com/user/repo',
            image: null,
            is_private: false,
            submit_all_versions: false,
        })

        expect(mockToastSuccess).toHaveBeenCalledWith('AppsCreateView.messages.success')
        expect(mockPush).toHaveBeenCalledWith({ name: 'apps' })
    })

    // --- 5. Fehler beim Speichern ---

    it('zeigt eine korrekte Fehlermeldung, wenn die API 403 (No Access) zurückgibt', async () => {
        ;(appApi.create as any).mockRejectedValue({
            response: { status: 403 }
        })

        const wrapper = mountComponent()
        const textInputs = wrapper.findAll('input[type="text"]')

        await textInputs[0]!.setValue('Super App')
        // Korrektur: Repo-URL ist Index 1
        await textInputs[1]!.setValue('https://github.com/user/repo')

        await wrapper.get('form').trigger('submit')
        await flushPromises()

        expect(mockToastError).toHaveBeenCalledWith('AppsCreateView.messages.noAccess')
    })

    it.each([
        [400, undefined, 'AppsCreateView.messages.validationError'],
        [422, undefined, 'AppsCreateView.messages.validationError'],
        [422, 'Name ist bereits vergeben.', 'Name ist bereits vergeben.'],
    ])('meldet %s als Eingabefehler, nicht als fehlende Berechtigung', async (status, detail, expected) => {
        ;(appApi.create as any).mockRejectedValue({
            response: { status, data: detail === undefined ? {} : { detail } }
        })

        const wrapper = mountComponent()
        const textInputs = wrapper.findAll('input[type="text"]')

        await textInputs[0]!.setValue('Super App')
        await textInputs[1]!.setValue('https://github.com/user/repo')

        await wrapper.get('form').trigger('submit')
        await flushPromises()

        expect(mockToastError).toHaveBeenCalledWith(expected)
    })

    describe('GitHub-App-Hinweis', () => {
        it('verlinkt die Installationsseite, die das Backend liefert', async () => {
            ;(appApi.getGithubApp as any).mockResolvedValueOnce({
                data: { install_url: 'https://github.com/apps/six7/installations/new' }
            })
            const wrapper = mountComponent()
            await flushPromises()

            const link = wrapper.find('[data-testid="github-app-install-link"]')
            expect(link.attributes('href')).toBe('https://github.com/apps/six7/installations/new')
            expect(wrapper.text()).toContain('AppsCreateView.info.installText')
        })

        it('zeigt keinen Link, wenn keine GitHub App konfiguriert ist', async () => {
            const wrapper = mountComponent()
            await flushPromises()

            expect(wrapper.find('[data-testid="github-app-install-link"]').exists()).toBe(false)
            expect(wrapper.html()).not.toContain('github.com/six7clickndeploy')
        })
    })

    it('reicht mit "alle Versionen einreichen" ein, wenn der Schalter an ist', async () => {
        ;(appApi.create as any).mockResolvedValue({ data: {} })
        const wrapper = mountComponent()
        const textInputs = wrapper.findAll('input[type="text"]')
        await textInputs[0]!.setValue('Super App')
        await textInputs[1]!.setValue('https://github.com/user/repo')

        const toggle = (w: { findAll: (s: string) => any[] }) =>
      w.findAll('button').find((b: any) => b.find('.toggle-knob').exists())!
        await toggle(wrapper).trigger('click')
        await wrapper.get('form').trigger('submit')
        await flushPromises()

        expect(appApi.create).toHaveBeenCalledWith(expect.objectContaining({ submit_all_versions: true }))
    })

    it('entfernt ein gewähltes Logo wieder und legt die App ohne Bild an', async () => {
        ;(appApi.create as any).mockResolvedValue({ data: {} })
        const wrapper = mountComponent()
        const textInputs = wrapper.findAll('input[type="text"]')
        await textInputs[0]!.setValue('Super App')
        await textInputs[1]!.setValue('https://github.com/user/repo')

        const fileInput = wrapper.find('input[type="file"]')
        const logo = new File(['x'], 'logo.png', { type: 'image/png' })
        Object.defineProperty(fileInput.element, 'files', { value: [logo] })
        await fileInput.trigger('change')
        expect(wrapper.text()).toContain('logo.png')

        await wrapper.findAll('button').find(b => b.text() === 'AppsCreateView.form.logoRemove')!.trigger('click')
        expect(wrapper.find('img').exists()).toBe(false)

        await wrapper.get('form').trigger('submit')
        await flushPromises()
        expect(appApi.create).toHaveBeenCalledWith(expect.objectContaining({ image: null }))
    })
})
