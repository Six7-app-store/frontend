import { describe, it, expect } from 'vitest'

import { useQuotas } from '@/composables/useQuotas'
import i18n from '@/i18n'
import type { QuotaOverview } from '@/types/quota'

const { getColorClass, getTextColorClass, isQuotaCritical } = useQuotas()

// One scale for bar, text and warning icon (see QUOTA_THRESHOLDS).
describe('Quota-Schwellen', () => {
  it.each([
    [0, 'bg-green-500'],
    [49, 'bg-green-500'],
    [50, 'bg-yellow-500'],
    [74, 'bg-yellow-500'],
    [75, 'bg-orange-500'],
    [89, 'bg-orange-500'],
    [90, 'bg-red-500'],
    [100, 'bg-red-500'],
  ])('färbt den Balken bei %s%% %s', (percentage, expected) => {
    expect(getColorClass(percentage)).toBe(expected)
  })

  it.each([
    [0, 'text-gray-600'],
    [74, 'text-gray-600'],
    [75, 'text-amber-500'],
    [89, 'text-amber-500'],
    [90, 'text-red-500'],
  ])('färbt den Text bei %s%% %s', (percentage, expected) => {
    expect(getTextColorClass(percentage)).toBe(expected)
  })

  it.each([
    [89, false],
    [90, true],
    [100, true],
  ])('meldet %s%% als kritisch: %s', (percentage, expected) => {
    expect(isQuotaCritical(percentage)).toBe(expected)
  })
})

const overview = {
  compute: {
    instances: { used: 1, limit: 4 },
    vcpus: { used: 2, limit: 8 },
    ram: { used: 2048, limit: 8192 },
  },
  storage: {
    volumes: { used: 1, limit: 5 },
    gigabytes: { used: 10, limit: 100 },
  },
  network: {
    floating_ips: { used: 1, limit: 2 },
  },
} as unknown as QuotaOverview

describe('Quota-Beschriftungen', () => {
  it('kommen aus i18n und folgen der Sprache', () => {
    const { quotas, formattedQuotas } = useQuotas()
    quotas.value = overview

    i18n.global.locale.value = 'de'
    expect(formattedQuotas.value.map((entry) => entry.label)).toEqual([
      'VMs / Instanzen', 'vCPUs', 'RAM', 'Volumes', 'Storage', 'Floating IPs',
    ])

    i18n.global.locale.value = 'en'
    expect(formattedQuotas.value[0]!.label).toBe('VMs / Instances')

    i18n.global.locale.value = 'de'
    quotas.value = null
  })
})
