/**
 * The badge colours are shared: the Badge component and the member list in
 * CourseDetailView must not drift apart again.
 */
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

import Badge from '@/components/ui/Badge.vue'
import { BADGE_VARIANT_CLASSES, type BadgeVariant } from '@/components/ui/badge-variants'

describe('Badge', () => {
  it.each(Object.keys(BADGE_VARIANT_CLASSES) as BadgeVariant[])('rendert die Farben der Variante %s', (variant) => {
    const wrapper = mount(Badge, { props: { variant }, slots: { default: 'Text' } })

    for (const cls of BADGE_VARIANT_CLASSES[variant].split(' ')) {
      expect(wrapper.classes()).toContain(cls)
    }
  })

  it('fällt ohne Variante auf grau zurück', () => {
    const wrapper = mount(Badge, { slots: { default: 'Text' } })

    expect(wrapper.classes()).toContain('bg-gray-100')
    expect(wrapper.classes()).toContain('text-gray-700')
  })
})
