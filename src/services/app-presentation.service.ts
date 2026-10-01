/**
 * Presentation rules for apps in the catalogue and detail view.
 */
import { Box, Database, Globe, LayoutTemplate, Layers, Server, Shield, Terminal } from 'lucide-vue-next'

/** Pick a lucide icon from keywords in the app name (fallback: ``Layers``). */
export function iconForAppName(appName: string | null | undefined) {
  const name = (appName || '').toLowerCase()
  if (name.includes('node')) return Server
  if (name.includes('vue') || name.includes('front')) return LayoutTemplate
  if (name.includes('react')) return Globe
  if (name.includes('python') || name.includes('jupyter') || name.includes('fastapi')) return Box
  if (name.includes('postgres') || name.includes('sql') || name.includes('data')) return Database
  if (name.includes('docker') || name.includes('container')) return Terminal
  if (name.includes('security') || name.includes('pen')) return Shield
  return Layers
}
