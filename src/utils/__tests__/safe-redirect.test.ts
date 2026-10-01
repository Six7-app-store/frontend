import { describe, it, expect } from 'vitest'
import { isInAppPath } from '@/utils/safe-redirect'

describe('isInAppPath', () => {
  it.each(['/', '/deployments', '/deployments/d1?tab=logs', '/user/openstack#creds'])('accepts %s', (p) => {
    expect(isInAppPath(p)).toBe(true)
  })

  it.each([
    'https://evil.example',
    '//evil.example',
    '/\\evil.example',
    'deployments',
    'javascript:alert(1)',
    '',
    null,
    undefined,
    ['/deployments'],
  ])('rejects %j', (p) => {
    expect(isInAppPath(p)).toBe(false)
  })
})
