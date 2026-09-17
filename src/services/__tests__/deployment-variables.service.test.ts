import { describe, it, expect } from 'vitest'

import { isMultiImagePackerLayout } from '@/services/deployment-variables.service'

describe('isMultiImagePackerLayout', () => {
  it('detects packer values nested per template key', () => {
    expect(isMultiImagePackerLayout({ packer: { web: { size: 1 }, db: {} } })).toBe(true)
  })

  it.each([
    [undefined],
    [null],
    [{}],
    [{ packer: 'flat' }],
    [{ packer: [] }],
    [{ packer: {} }],
    [{ packer: { web: { size: 1 }, flat: 'x' } }],
    [{ packer: { web: [] } }],
    [{ packer: { web: null } }],
  ])('treats %j as the flat layout', (variables) => {
    expect(isMultiImagePackerLayout(variables)).toBe(false)
  })
})
