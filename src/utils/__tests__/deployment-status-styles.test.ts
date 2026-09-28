import { describe, it, expect } from 'vitest'
import { AlertCircle, CheckCircle, Loader2, PauseCircle } from 'lucide-vue-next'

import { getStatusStyles } from '@/utils/deployment-status-styles'
import de from '@/i18n/locales/de'

const STATUSES = [
  'success', 'running', 'pending', 'failed', 'destroying', 'cancelled', 'destroyed',
  'pausing', 'paused', 'resuming', 'pause_failed', 'resume_failed',
]

describe('getStatusStyles', () => {
  it.each(STATUSES)('uses an existing i18n label for %s', (status) => {
    const key = getStatusStyles(status).label.replace('DeploymentsView.', '')
    expect(de.DeploymentsView).toHaveProperty(key)
  })

  it('maps icons and badge classes', () => {
    expect(getStatusStyles('success')).toMatchObject({ icon: CheckCircle, badgeClass: 'status-success' })
    expect(getStatusStyles('running').icon).toBe(Loader2)
    expect(getStatusStyles('paused').icon).toBe(PauseCircle)
    expect(getStatusStyles('pause_failed').icon).toBe(AlertCircle)
  })

  it('colours the icon green, red, muted or amber', () => {
    expect(getStatusStyles('success').iconClass).toBe('text-success')
    expect(getStatusStyles('failed').iconClass).toBe('text-danger')
    expect(getStatusStyles('running').iconClass).toBe('text-fg-muted')
    expect(getStatusStyles('paused').iconClass).toBe('text-warning')
  })

  it('falls back to a neutral style for unknown statuses', () => {
    expect(getStatusStyles(undefined)).toEqual({
      label: 'DeploymentsView.noStatus',
      iconClass: 'text-warning',
      badgeClass: 'status-neutral',
      icon: AlertCircle,
    })
  })
})
