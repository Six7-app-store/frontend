import { describe, it, expect } from 'vitest'
import { userDisplayName } from '@/utils/user-display'

describe('userDisplayName', () => {
  it('prefers the full name', () => {
    expect(userDisplayName({ firstName: 'Lea', lastName: 'Moodle', username: 'lea' }, 'u1')).toBe('Lea Moodle')
  })

  it('uses whichever name part exists', () => {
    expect(userDisplayName({ firstName: 'Lea' }, 'u1')).toBe('Lea')
    expect(userDisplayName({ lastName: 'Moodle' }, 'u1')).toBe('Moodle')
  })

  it('falls back to username, then email, then name', () => {
    expect(userDisplayName({ username: 'lea', email: 'lea@x.de' }, 'u1')).toBe('lea')
    expect(userDisplayName({ email: 'lea@x.de', name: 'L' }, 'u1')).toBe('lea@x.de')
    expect(userDisplayName({ name: 'L' }, 'u1')).toBe('L')
  })

  it('shows the fallback for a missing or empty user', () => {
    expect(userDisplayName(undefined, 'u1')).toBe('u1')
    expect(userDisplayName(null, 'u1')).toBe('u1')
    expect(userDisplayName({}, 'u1')).toBe('u1')
  })
})
