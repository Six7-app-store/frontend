import { describe, it, expect } from 'vitest'
import {
  adaptResource,
  filterResources,
  selectedKeysOf,
  type ResourceItem,
} from '@/services/openstack-resource-presentation.service'

const t = (key: string) => key

describe('adaptResource', () => {
  it('describes a flavor by its specs and marks a private one', () => {
    expect(adaptResource('flavor', { id: 'f', name: 'm1', vcpus: 2, ram: 4096, disk: 40, is_public: false }, t))
      .toMatchObject({ id: 'f', name: 'm1', secondary: '2 vCPU · 4 GB RAM · 40 GB Disk', tertiary: 'openstackPicker.network.private' })
  })

  it('shows an image status only when it is not active', () => {
    expect(adaptResource('image', { id: 'i', name: 'ubuntu', status: 'active', disk_format: 'qcow2' }, t).tertiary).toBe('')
    expect(adaptResource('image', { id: 'i', name: 'ubuntu', status: 'queued' }, t).tertiary).toBe('queued')
  })

  it('joins the network flags', () => {
    expect(adaptResource('network', { id: 'n', name: 'net', shared: true, external: true }, t).tertiary)
      .toBe('openstackPicker.network.shared · openstackPicker.network.external')
  })

  it('keys keypairs and availability zones by name, they have no id', () => {
    expect(adaptResource('keypair', { name: 'mine', fingerprint: '0123456789abcdefXYZ' }, t))
      .toMatchObject({ id: 'mine', secondary: '0123456789abcdef…', tertiary: 'ssh' })
    expect(adaptResource('availability_zone', { name: 'nova', state: 'available' }, t))
      .toMatchObject({ id: 'nova', secondary: 'available' })
  })

  it('names an unnamed volume', () => {
    expect(adaptResource('volume', { id: 'v', size: 10, bootable: true, status: 'in-use' }, t))
      .toMatchObject({ name: 'openstackPicker.unnamed', secondary: '10 GB · ', tertiary: 'bootable · in-use' })
  })
})

describe('selectedKeysOf', () => {
  it('coerces a single value and treats null forms as empty', () => {
    expect([...selectedKeysOf(2, false)]).toEqual(['2'])
    expect([...selectedKeysOf('null', false)]).toEqual([])
    expect([...selectedKeysOf(undefined, false)]).toEqual([])
  })

  it('takes an array or a comma-separated string in multi mode', () => {
    expect([...selectedKeysOf(['a', null, 'b'], true)]).toEqual(['a', 'b'])
    expect([...selectedKeysOf('a, b', true)]).toEqual(['a', 'b'])
    expect([...selectedKeysOf('', true)]).toEqual([])
  })
})

describe('filterResources', () => {
  const item = (id: string, name: string, secondary = ''): ResourceItem => ({ id, name, secondary, raw: {} })
  const items = [item('1', 'alpha'), item('2', 'beta', '4 vCPU'), item('3', 'gamma')]

  it('matches name, id and spec line case-insensitively', () => {
    expect(filterResources(items, 'BETA', () => false).map((i) => i.id)).toEqual(['2'])
    expect(filterResources(items, '3', () => false).map((i) => i.id)).toEqual(['3'])
    expect(filterResources(items, '4 vcpu', () => false).map((i) => i.id)).toEqual(['2'])
  })

  it('puts selected items first and keeps the order otherwise', () => {
    const selected = new Set(['3', '2'])
    expect(filterResources(items, '', (i) => selected.has(i.id)).map((i) => i.id)).toEqual(['2', '3', '1'])
  })
})
