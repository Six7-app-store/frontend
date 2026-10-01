import { describe, it, expect } from 'vitest'

import { useQuotas } from '@/composables/useQuotas'
import i18n from '@/i18n'
import type { QuotaOverview } from '@/types/quota'

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
