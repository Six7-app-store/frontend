import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import { defineComponent, h } from 'vue'

import TeamBuilder from '@/components/deployment-wizard/TeamBuilder.vue'
import { useTeamAssignment } from '@/composables/useTeamAssignment'
import { useDeploymentStore } from '@/stores/deployment.store'
import { splitProblem } from '@/services/team-assignment.service'
import de from '@/i18n/locales/de'

enableAutoUnmount(afterEach)

/** TeamBuilder inside a host that owns the assignment, as StepTarget does. */
const Host = defineComponent({
  setup() {
    const assignment = useTeamAssignment()
    assignment.prepare()
    assignment.setCustom()
    return () => h(TeamBuilder, { assignment, nameOf: (id: string) => id.toUpperCase() })
  },
})

const dataTransfer = () => ({ setData: () => {}, effectAllowed: '', dropEffect: '' })

async function mountBuilder() {
  const wrapper = mount(Host, {
    global: {
      plugins: [createI18n({ legacy: false, locale: 'de', messages: { de } })],
      stubs: { ConfirmModal: { props: ['show'], emits: ['confirm'], template: '<div v-if="show" data-testid="confirm"><button data-testid="confirm-yes" @click="$emit(\'confirm\')" /></div>' } },
    },
  })
  await flushPromises()
  return wrapper
}

describe('TeamBuilder', () => {
  beforeEach(() => {
    sessionStorage.clear()
    setActivePinia(createPinia())
    useDeploymentStore().draft.studentIds = ['a', 'b', 'c']
  })

  it('ändert die Anzahl der Gruppen in den Grenzen 1 bis Personenzahl', async () => {
    const wrapper = await mountBuilder()
    const [minus, plus] = wrapper.findAll('button').filter((b) => b.attributes('aria-label'))
    expect(wrapper.get('[data-testid="team-count"]').text()).toBe('2')

    await plus!.trigger('click')
    expect(wrapper.get('[data-testid="team-count"]').text()).toBe('3')
    expect(plus!.attributes('disabled')).toBeDefined()

    await minus!.trigger('click')
    await minus!.trigger('click')
    expect(wrapper.get('[data-testid="team-count"]').text()).toBe('1')
    expect(minus!.attributes('disabled')).toBeDefined()
  })

  it('setzt nach Rückfrage alle zurück in „Noch ohne Gruppe“ und verschiebt per Drag & Drop', async () => {
    const wrapper = await mountBuilder()
    await wrapper.get('[data-testid="btn-reset"]').trigger('click')
    await wrapper.get('[data-testid="confirm-yes"]').trigger('click')
    expect(wrapper.get('[data-testid="pool-count"]').text()).toBe('3')
    expect(splitProblem(useDeploymentStore().draft)).toBe('deployment.wizard.block.unassigned')

    const chip = wrapper.get('[data-testid="unassigned-dropzone"] [draggable="true"]')
    await chip.trigger('dragstart', { dataTransfer: dataTransfer() })
    await wrapper.get('[data-testid="group-dropzone-1"]').trigger('drop', { dataTransfer: dataTransfer() })
    expect(wrapper.get('[data-testid="pool-count"]').text()).toBe('2')
    expect(wrapper.get('[data-testid="group-dropzone-1"]').text()).toContain('A')
  })

  it('verteilt per Zufall alle auf die Gruppen', async () => {
    const wrapper = await mountBuilder()
    await wrapper.get('[data-testid="btn-reset"]').trigger('click')
    await wrapper.get('[data-testid="confirm-yes"]').trigger('click')
    await wrapper.get('[data-testid="btn-shuffle"]').trigger('click')
    expect(wrapper.get('[data-testid="pool-count"]').text()).toBe('0')
  })

  it('benennt die Namensfelder der Gruppen für Screenreader', async () => {
    const wrapper = await mountBuilder()
    expect(wrapper.findAll('input').map((i) => i.attributes('aria-label'))).toEqual(['Name der Gruppe 1', 'Name der Gruppe 2'])
  })
})
