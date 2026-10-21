import { describe, it, expect, afterEach } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'

import FileDropZone from '@/components/FileDropZone.vue'
import de from '@/i18n/locales/de'

enableAutoUnmount(afterEach)

const i18n = () => createI18n({ legacy: false, locale: 'de', messages: { de } })
const file = (name: string, size = 3) => {
  const f = new File(['x'.repeat(size)], name, { type: 'text/plain' })
  return f
}

/** Waits until FileReader finished for every picked file. */
async function settle() {
  for (let i = 0; i < 10; i++) {
    await flushPromises()
    await new Promise((resolve) => setTimeout(resolve, 0))
  }
}

async function drop(wrapper: ReturnType<typeof mount>, files: File[]) {
  await wrapper.get('[data-testid="drop-zone"]').trigger('drop', { dataTransfer: { files } })
  await settle()
}

describe('FileDropZone', () => {
  it('ist per Tastatur erreichbar und liefert im Einzelmodus eine Datei als Payload', async () => {
    const wrapper = mount(FileDropZone, { props: { label: 'Aufgabe' }, global: { plugins: [i18n()] } })
    expect(wrapper.get('[data-testid="drop-zone"]').element.tagName).toBe('BUTTON')

    await drop(wrapper, [file('a.txt'), file('b.txt')])
    const [payload] = wrapper.emitted('update:modelValue')![0] as [{ name: string; content_b64: string; size: number }]
    expect(payload).toMatchObject({ name: 'a.txt', content_b64: 'eHh4', size: 3 })
  })

  it('zeigt eine gewählte Datei mit Entfernen-Knopf', async () => {
    const wrapper = mount(FileDropZone, {
      props: { modelValue: { name: 'a.txt', content_b64: 'eHh4', size: 3, content_type: 'text/plain' } },
      global: { plugins: [i18n()] },
    })
    expect(wrapper.text()).toContain('a.txt')
    await wrapper.get('button[aria-label="Entfernen"]').trigger('click')
    expect(wrapper.emitted('update:modelValue')).toEqual([[null]])
  })

  it('nimmt im Mehrfachmodus alle Dateien und lässt zu große mit Fehlertext weg', async () => {
    const wrapper = mount(FileDropZone, {
      props: { multiple: true, maxBytes: 5, label: 'Alle Dateien', hint: 'Zuordnung über den Namen.' },
      global: { plugins: [i18n()] },
    })
    expect(wrapper.get('[data-testid="file-input"]').attributes('multiple')).toBeDefined()
    expect(wrapper.text()).toContain('Zuordnung über den Namen.')

    await drop(wrapper, [file('a.txt'), file('gross.txt', 10), file('b.txt')])
    const [payloads] = wrapper.emitted('files')![0] as [Array<{ name: string }>]
    expect(payloads.map((p) => p.name)).toEqual(['a.txt', 'b.txt'])
    expect(wrapper.get('[role="alert"]').text()).toContain('gross.txt')
  })

  it('lehnt im Einzelmodus eine zu große Datei ab', async () => {
    const wrapper = mount(FileDropZone, { props: { maxBytes: 2 }, global: { plugins: [i18n()] } })
    await drop(wrapper, [file('gross.txt', 10)])
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    expect(wrapper.emitted('error')).toHaveLength(1)
  })
})
