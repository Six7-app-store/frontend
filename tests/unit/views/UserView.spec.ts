import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'

import UserView from '@/views/UserView.vue'

// ---------------------------------------------------------
// 1. Mocks & Setup
// ---------------------------------------------------------

// i18n im setup() von UserView nicht via app.use installiert — daher mocken
vi.mock('vue-i18n', () => ({
    useI18n: () => ({
        t: (key: string, vars?: any) => {
            // Role-Label-Keys auf deutsche Strings mappen (die Tests erwarten
            // "Student", "Administrator" usw. — die View nutzt
            // ``t(roleLabelKey(role))``).
            const roleMap: Record<string, string> = {
                'roleLabels.admin': 'Administrator',
                'roleLabels.teacher': 'Lehrer',
                'roleLabels.student': 'Student',
                'roleLabels.unknown': 'Unbekannt',
                'UserView.loading': 'Lade Benutzerdaten...',
            }
            if (key in roleMap) return roleMap[key]
            return vars ? `${key} ${JSON.stringify(vars)}` : key
        }
    })
}))

// Wir definieren eine Variable für den User, die wir in jedem Test ändern können
let mockUser: any = null

vi.mock('@/stores/auth.store', () => ({
    useAuthStore: () => ({
        get user() { return mockUser }
    })
}))

// ---------------------------------------------------------
// 2. Die Tests
// ---------------------------------------------------------

describe('UserView.vue', () => {

    beforeEach(() => {
        vi.clearAllMocks()
        // Standardmäßig starten wir jeden Test ohne User
        mockUser = null
    })

    const mountComponent = () => {
        return mount(UserView, {
            global: {
                stubs: {
                    // Wir erstellen kleine Stubs für die UI-Komponenten
                    Badge: { template: '<span class="badge"><slot /></span>' },
                    RouterLink: {
                        props: ['to'],
                        template: '<a :href="typeof to === \'string\' ? to : to.name" class="router-link-stub"><slot /></a>'
                    }
                }
            }
        })
    }

    // --- 1. Ladezustand ---

    it('zeigt einen Lade-Text an, solange kein User vorhanden ist', () => {
        mockUser = null
        const wrapper = mountComponent()

        expect(wrapper.text()).toContain('Lade Benutzerdaten...')
        // Prüfen, ob die Einstellungs-Karten noch nicht gerendert werden
        expect(wrapper.text()).not.toContain('Vorname')
    })

    // --- 2. Erfolgsfall (Happy Path) mit allen Daten ---

    it('zeigt alle Benutzerinformationen korrekt an, wenn sie vorhanden sind', () => {
        mockUser = {
            username: 'maxmuster',
            firstName: 'Max',
            lastName: 'Mustermann',
            email: 'max@test.de',
            role: 'student',
            userId: 'u-12345',
            keycloak_id: 'kc-98765',
            course: { name: 'Informatik Kurs A' },
            // Ein Datum in der Vergangenheit, um die Formatierung zu testen
            created_at: '2024-01-15T10:00:00Z'
        }

        const wrapper = mountComponent()

        expect(wrapper.text()).toContain('maxmuster')
        expect(wrapper.text()).toContain('Max')
        expect(wrapper.text()).toContain('Mustermann')
        expect(wrapper.text()).toContain('max@test.de')
        expect(wrapper.text()).toContain('Student') // Computed Property Test
        expect(wrapper.text()).toContain('u-12345')
        expect(wrapper.text()).toContain('kc-98765')
        expect(wrapper.text()).toContain('Informatik Kurs A')

        // Prüfen, ob das Jahr 2024 im formatierten Datum auftaucht
        expect(wrapper.text()).toContain('2024')
    })

    // --- 3. Fallbacks (Fehlende Daten) ---

    it('zeigt "N/A" an, wenn optionale Felder fehlen', () => {
        mockUser = {
            username: 'minimalist',
            role: 'admin'
            // firstName, lastName, course, email etc. fehlen absichtlich!
        }

        const wrapper = mountComponent()

        // Die Komponente ist so programmiert, dass sie 6 Mal 'N/A' anzeigt
        // (Vorname, Nachname, E-Mail, Kurs, UserID, KeycloakID) + 1x fürs Datum = 7x N/A
        const text = wrapper.text()
        expect(text).toContain('N/A')

        // Testen wir explizit, ob der Administrator-Label korrekt gerendert wurde
        expect(text).toContain('Administrator')
    })

    // --- 4. Rollen-Logik (Computed Properties) ---

    it('übersetzt die englischen Rollen korrekt ins Deutsche', () => {
        // 1. Admin testen
        mockUser = { role: 'admin' }
        let wrapper = mountComponent()
        expect(wrapper.text()).toContain('Administrator')

        // 2. Teacher testen
        mockUser = { role: 'teacher' }
        wrapper = mountComponent()
        expect(wrapper.text()).toContain('Lehrer')

        // 3. Fallback testen (Unbekannte Rolle)
        mockUser = { role: 'hacker' }
        wrapper = mountComponent()
        expect(wrapper.text()).toContain('Unbekannt')
    })

    // --- 5. Navigation ---

    it('verlinkt korrekt auf die OpenStack-Einstellungen', () => {
        mockUser = { username: 'testuser', role: 'teacher' }
        const wrapper = mountComponent()

        const link = wrapper.find('a.router-link-stub')
        expect(link.exists()).toBe(true)
        expect(link.attributes('href')).toBe('user.openstack')
    })

    it('zeigt Studenten den OpenStack-Einstieg nicht', () => {
        // Die Route ist Staff-only; für Studenten wäre der Eintrag ein
        // Link nach /forbidden.
        mockUser = { username: 'testuser', role: 'student' }
        const wrapper = mountComponent()

        expect(wrapper.find('a.router-link-stub').exists()).toBe(false)
        expect(wrapper.text()).not.toContain('UserView.settings.title')
    })
})