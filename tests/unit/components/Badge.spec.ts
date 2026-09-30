/**
 * The badge colours are shared: the Badge component and the member list in
 * CourseDetailView must not drift apart again.
 */
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

import Badge from '@/components/ui/Badge.vue'
import { BADGE_TONE_CLASSES } from '@/components/ui/badge-tones'
import type { BadgeTone } from '@/types/tone'

describe('Badge', () => {
  it.each(Object.keys(BADGE_TONE_CLASSES) as BadgeTone[])('rendert die Farben des Tons %s', (tone) => {
    const wrapper = mount(Badge, { props: { tone }, slots: { default: 'Text' } })

    expect(wrapper.classes()).toContain(BADGE_TONE_CLASSES[tone])
  })

  it('fällt ohne Ton auf neutral zurück', () => {
    const wrapper = mount(Badge, { slots: { default: 'Text' } })

    expect(wrapper.classes()).toContain('status-neutral')
  })
})
