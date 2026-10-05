/**
 * The variable step of the deployment wizard as pure functions: which form
 * key and which slots a variable has, how its form values are restored from
 * the draft or from saved input, how they are written back to the draft,
 * and which required values are missing. No Vue, no I/O.
 *
 * Form values are keyed by variable name; a scoped variable (team/user)
 * holds a map slot → value instead of a single value. List values are
 * edited as comma text and stored as arrays.
 */
import type { AppVariable } from '@/types'
import { effectiveVariableScope } from '@/services/deployment-variables.service'
import { isBool, isList, isNumber, splitCsv } from '@/services/variable-types'

export interface WizardTeamMember {
  userId: string
  username: string
}

export interface WizardTeam {
  name: string
  members: WizardTeamMember[]
}

export type FormValues = Record<string, any>

const isPlainObject = (v: unknown): v is Record<string, any> =>
  !!v && typeof v === 'object' && !Array.isArray(v)

export const isFileVariable = (v: AppVariable): boolean => v.osType === 'file'

export const isScoped = (v: AppVariable): boolean => effectiveVariableScope(v) !== 'all'

/** Slot key of one person in a user-scoped variable. */
export const userSlotKey = (teamName: string, username: string): string => `${teamName}-${username}`

/** The slots of a scoped variable: one per team, or one per person. */
export function slotKeysFor(v: AppVariable, teams: WizardTeam[]): string[] {
  const scope = effectiveVariableScope(v)
  if (scope === 'team') return teams.map((t) => t.name)
  if (scope === 'user') return teams.flatMap((t) => t.members.map((m) => userSlotKey(t.name, m.username)))
  return []
}

/** Drops repeated definitions of the same name; the first wins. */
export function dedupeDefinitions(raw: AppVariable[]): AppVariable[] {
  const unique = new Map<string, AppVariable>()
  for (const v of raw) {
    if (!unique.has(v.name)) unique.set(v.name, v)
  }
  return Array.from(unique.values())
}

/**
 * The slot map of a scoped variable: existing slot values are kept, empty
 * slots get the author default. Object defaults (e.g. ``map(string)`` with
 * ``{}``) have no per-slot value and leave the map as it is.
 */
export function seedScopedDefault(
  v: AppVariable,
  teams: WizardTeam[],
  existing?: Record<string, any>,
): Record<string, any> {
  const map: Record<string, any> = isPlainObject(existing) ? { ...existing } : {}
  const def = v.default
  const seedable =
    def !== undefined && def !== null &&
    (typeof def === 'string' || typeof def === 'number' || typeof def === 'boolean' || Array.isArray(def))
  if (!seedable) return map
  // List defaults as comma text, like the non-scoped list input.
  const seed = isList(v.type) && Array.isArray(def) ? def.join(', ') : def
  for (const slot of slotKeysFor(v, teams)) {
    const cur = map[slot]
    if (cur === undefined || cur === null || cur === '') map[slot] = seed
  }
  return map
}

/**
 * Form values restored from ``draft.variables`` when the user comes back to
 * this step; missing values fall back to the default.
 */
export function hydrateFromDraft(
  definitions: AppVariable[],
  stored: Record<string, any>,
  teams: WizardTeam[],
): FormValues {
  const values: FormValues = {}
  for (const v of definitions) {
    // File variables travel through draft.fileUploads, not the form values.
    if (isFileVariable(v)) continue
    const key = v.name
    const storedValue = stored[v.name]

    if (isScoped(v)) {
      values[key] = seedScopedDefault(v, teams, isPlainObject(storedValue) ? storedValue : undefined)
      continue
    }
    let value: any
    if (storedValue !== undefined && storedValue !== null) value = storedValue
    else if (v.default !== undefined && v.default !== null) value = v.default
    else value = ''
    values[key] = isList(v.type) && Array.isArray(value) ? value.join(', ') : value
  }
  return values
}

/**
 * Form values for freshly loaded definitions: previously saved input
 * (``userInputVar``) wins over the default.
 */
export function hydrateFromInput(
  definitions: AppVariable[],
  saved: Record<string, any>,
  teams: WizardTeam[],
): FormValues {
  const values: FormValues = {}
  for (const v of definitions) {
    const key = v.name
    let value: any = ''
    if (saved[key] !== undefined) value = saved[key]
    else if (v.default !== undefined && v.default !== null) value = v.default

    if (isScoped(v) && !isFileVariable(v)) {
      values[key] = seedScopedDefault(v, teams, isPlainObject(value) ? value : undefined)
      continue
    }
    if (isList(v.type) && Array.isArray(value)) value = value.join(', ')
    if (value === '' || value === null || value === undefined) value = isBool(v.type) ? false : ''
    values[key] = value
  }
  return values
}

/**
 * A value as the input holds it, made comparable with the default: lists
 * as sorted JSON, numbers as numbers (an empty input and no default both
 * become ``null``), booleans as booleans, text trimmed.
 */
function comparable(val: any, type: string): unknown {
  if (val === null || val === undefined) {
    if (isList(type)) return []
    if (isBool(type)) return false
    if (isNumber(type)) return null
    return ''
  }
  if (isList(type)) {
    const arr = Array.isArray(val) ? val : typeof val === 'string' ? splitCsv(val) : [String(val)]
    return JSON.stringify([...arr].sort())
  }
  if (isNumber(type)) return val === '' ? null : Number(val)
  if (isBool(type)) return Boolean(val)
  return String(val).trim()
}

/** A value as the input holds it, in the shape the draft stores. */
function storable(val: any, type: string): any {
  if (isList(type) && typeof val === 'string') return splitCsv(val)
  if (isNumber(type) && val !== '') return Number(val)
  return val
}

/**
 * The form values written back for the draft: ``all`` becomes
 * ``draft.variables``, ``changed`` (only what differs from the defaults, and
 * filled scoped slots) becomes ``userInputVar``.
 */
export function serializeValues(
  definitions: AppVariable[],
  values: FormValues,
): { changed: Record<string, any>; all: Record<string, any> } {
  const changed: Record<string, any> = {}
  const all: Record<string, any> = {}

  for (const v of definitions) {
    if (isFileVariable(v)) continue
    const key = v.name

    let value: any
    let isChange: boolean
    if (isScoped(v)) {
      const map = values[key]
      const clean: Record<string, any> = {}
      if (isPlainObject(map)) {
        for (const [slot, raw] of Object.entries(map)) {
          if (raw === undefined || raw === null) continue
          if (typeof raw === 'string' && raw.trim() === '') continue
          clean[slot] = storable(raw, v.type)
        }
      }
      value = clean
      isChange = Object.keys(clean).length > 0
    } else {
      value = storable(values[key], v.type)
      isChange = comparable(values[key], v.type) !== comparable(v.default, v.type)
    }

    if (isChange) changed[v.name] = value
    all[v.name] = value
  }

  return { changed, all }
}

const isEmptyValue = (val: any): boolean =>
  val === undefined || val === null ||
  (typeof val === 'string' && val.trim() === '') ||
  (Array.isArray(val) && val.length === 0)

/** Required values that are still empty — per slot for scoped variables, e.g. ``login (Rot-anna)``. */
export function missingRequired(
  definitions: AppVariable[],
  values: FormValues,
  teams: WizardTeam[],
): string[] {
  const missing: string[] = []
  for (const v of definitions) {
    if (!v.required || isFileVariable(v)) continue
    const key = v.name
    if (!isScoped(v)) {
      if (isEmptyValue(values[key])) missing.push(v.name)
      continue
    }
    const slots = slotKeysFor(v, teams)
    if (slots.length === 0) {
      missing.push(v.name)
      continue
    }
    const map = (values[key] ?? {}) as Record<string, any>
    for (const slot of slots) {
      if (isEmptyValue(map[slot])) missing.push(`${v.name} (${slot})`)
    }
  }
  return missing
}

/**
 * Removes slot values whose team or person no longer exists (e.g. a team
 * was renamed) and returns them as ``"<variable> → <slot>"`` for a notice.
 * Mutates the slot maps in ``values``.
 */
export function dropStaleSlots(
  definitions: AppVariable[],
  values: FormValues,
  teams: WizardTeam[],
): string[] {
  const dropped: string[] = []
  for (const v of definitions) {
    if (!isScoped(v) || isFileVariable(v)) continue
    const map = values[v.name]
    if (!isPlainObject(map)) continue
    const valid = new Set(slotKeysFor(v, teams))
    for (const slot of Object.keys(map)) {
      if (!valid.has(slot)) {
        dropped.push(`${v.name} → ${slot}`)
        delete map[slot]
      }
    }
  }
  return dropped
}
