/**
 * Groups card of the deployment detail page: the drill-down must open the
 * clicked group even when the assignment keys have gaps.
 */
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import DeploymentGroupsCard from '@/components/deployment/DeploymentGroupsCard.vue'
import de from '@/i18n/locales/de'

describe('DeploymentGroupsCard', () => {
  it('öffnet bei lückenhaften Gruppen-Keys die angeklickte Gruppe', async () => {
    const wrapper = mount(DeploymentGroupsCard, {
      props: {
        groups: [
          { index: 0, name: 'A', students: ['s1'] },
          { index: 2, name: 'C', students: ['s3', 's4'] },
        ],
      },
      global: {
        plugins: [createI18n({ legacy: false, locale: 'de', messages: { de } })],
      },
    })

    const cards = wrapper.findAll('div.cursor-pointer')
    await cards[1]!.trigger('click')

    expect(wrapper.text()).toContain('s3')
    expect(wrapper.text()).toContain('s4')
    expect(wrapper.text()).not.toContain('s1')
    expect(wrapper.find('div.font-semibold.text-lg').text()).toBe('C')
  })
})
