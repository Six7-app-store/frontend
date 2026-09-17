import { describe, it, expect } from 'vitest'
import { Box, Database, Globe, LayoutTemplate, Layers, Server, Shield, Terminal } from 'lucide-vue-next'

import { iconForAppName } from '@/services/app-presentation.service'

describe('iconForAppName', () => {
  it.each([
    ['Node API', Server],
    ['Vue Frontend', LayoutTemplate],
    ['React App', Globe],
    ['Jupyter Lab', Box],
    ['PostgreSQL', Database],
    ['Docker Sandbox', Terminal],
    ['Pentest Lab', Shield],
    ['Something else', Layers],
  ])('%s → icon', (name, icon) => {
    expect(iconForAppName(name)).toBe(icon)
  })

  it('checks keywords in priority order and tolerates empty names', () => {
    expect(iconForAppName('node frontend')).toBe(Server)
    expect(iconForAppName(null)).toBe(Layers)
    expect(iconForAppName('')).toBe(Layers)
  })
})
