/**
 * The HCL variable types the wizard distinguishes, and how list values are
 * edited. Pure functions — no Vue, no I/O.
 */

/** ``bool`` / ``boolean``, case-insensitive. */
export const isBool = (type: string): boolean =>
  ['bool', 'boolean'].includes(type.toLowerCase())

/** ``number`` / ``int`` / ``integer``, case-insensitive. */
export const isNumber = (type: string): boolean =>
  ['number', 'int', 'integer'].includes(type.toLowerCase())

/** ``list(...)`` / ``set(...)`` / ``array...``, case-insensitive. */
export const isList = (type: string): boolean => {
  const t = type.toLowerCase()
  return t.startsWith('list') || t.startsWith('set') || t.startsWith('array')
}

/**
 * A list value as the user edits it — ``"a, b,,c "`` — split into its
 * trimmed, non-empty entries.
 */
export const splitCsv = (value: string): string[] =>
  value.split(',').map((s) => s.trim()).filter((s) => s !== '')
