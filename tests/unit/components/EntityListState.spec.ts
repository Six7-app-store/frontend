import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

import EntityListState from '@/components/ui/EntityListState.vue'

const mountState = (props: Record<string, unknown>) =>
  mount(EntityListState, {
    props: { emptyMessage: 'Nichts da', errorMessage: 'Laden fehlgeschlagen', ...props },
    slots: { default: '<ul class="list">Liste</ul>', 'error-action': '<a class="retry">Zur Liste</a>' },
  })

describe('EntityListState', () => {
  it('zeigt beim Laden nur den Spinner', () => {
    const wrapper = mountState({ isLoading: true, isError: true, isEmpty: true })
    expect(wrapper.find('.animate-spin').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('Laden fehlgeschlagen')
  })

  it('zeigt einen Fehler vor dem Leerzustand, mit Aktion', () => {
    const wrapper = mountState({ isError: true, isEmpty: true })
    expect(wrapper.text()).toContain('Laden fehlgeschlagen')
    expect(wrapper.find('.retry').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('Nichts da')
  })

  it('zeigt sonst den Leerzustand oder den Inhalt', () => {
    expect(mountState({ isEmpty: true }).text()).toContain('Nichts da')
    expect(mountState({}).find('.list').exists()).toBe(true)
  })
})
