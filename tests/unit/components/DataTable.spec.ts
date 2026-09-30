import { describe, it, expect } from 'vitest'
import { mount, RouterLinkStub } from '@vue/test-utils'

import DataTable, { type DataTableColumn } from '@/components/ui/DataTable.vue'

interface Row {
  id: string
  name: string
  version: string
  note?: string | null
}

const columns: DataTableColumn[] = [
  { id: 'name', label: 'Name' },
  { id: 'version', label: 'Version', class: 'w-32' },
  { id: 'actions', label: 'Aktionen', hideLabel: true, interactive: true },
]

const rows: Row[] = [
  { id: 'a', name: 'Online-IDE', version: 'v1.2.0', note: null },
  { id: 'b', name: 'Wiki', version: 'v0.9.1' },
]

function mountTable(props: Record<string, unknown> = {}, slots: Record<string, string> = {}) {
  return mount(DataTable, {
    props: { columns, rows, rowKey: (row: object) => (row as Row).id, caption: 'Apps', ...props },
    slots,
    global: { stubs: { RouterLink: RouterLinkStub } },
  })
}

describe('DataTable', () => {
  it('rendert Kopf und Zeilen aus den Spalten und benennt die Tabelle', () => {
    const wrapper = mountTable()

    expect(wrapper.get('caption').text()).toBe('Apps')
    expect(wrapper.findAll('th').map((th) => th.text())).toEqual(['Name', 'Version', 'Aktionen'])
    expect(wrapper.findAll('tbody tr')).toHaveLength(2)
    expect(wrapper.findAll('tbody tr')[0]!.findAll('td')[1]!.text()).toBe('v1.2.0')
  })

  it('schreibt fehlende Werte als leere Zelle und blendet versteckte Labels nur visuell aus', () => {
    const wrapper = mountTable()

    expect(wrapper.findAll('tbody tr')[1]!.findAll('td')[2]!.text()).toBe('')
    expect(wrapper.findAll('th')[2]!.get('span').classes()).toContain('sr-only')
  })

  it('übernimmt die Spaltenklassen auf die Spaltenbreite', () => {
    const wrapper = mountTable()

    expect(wrapper.findAll('col')[1]!.classes()).toContain('w-32')
  })

  it('lässt Zellen über cell-Slots selbst rendern', () => {
    const wrapper = mountTable({}, {
      'cell-version': '<template #cell-version="{ row }"><code>{{ row.version }}</code></template>',
    })

    expect(wrapper.findAll('tbody tr')[0]!.get('code').text()).toBe('v1.2.0')
  })

  it('macht mit rowTo die erste Zelle zum Link über die ganze Zeile', () => {
    const wrapper = mountTable({ rowTo: (row: object) => ({ name: 'apps.detail', params: { id: (row as Row).id } }) })
    const firstRow = wrapper.findAll('tbody tr')[0]!
    const link = firstRow.findComponent(RouterLinkStub)

    expect(firstRow.classes()).toContain('data-row')
    expect(link.props('to')).toEqual({ name: 'apps.detail', params: { id: 'a' } })
    expect(link.classes()).toContain('row-link')
    expect(firstRow.findAll('a')).toHaveLength(1)
  })

  it('hält Buttons in interactive-Spalten über dem Zeilenlink', () => {
    const wrapper = mountTable({ rowTo: () => '/x' })

    expect(wrapper.findAll('tbody tr')[0]!.findAll('td')[2]!.classes()).toContain('z-10')
  })

  it('zeigt ohne Zeilen den empty-Slot unter dem Kopf', () => {
    const wrapper = mountTable({ rows: [] }, { empty: '<p class="empty">Nichts da</p>' })

    expect(wrapper.find('tbody').exists()).toBe(false)
    expect(wrapper.find('thead').exists()).toBe(true)
    expect(wrapper.get('.empty').text()).toBe('Nichts da')
  })
})
