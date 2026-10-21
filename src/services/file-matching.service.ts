/**
 * Matching uploaded files to the people or teams of a per-user or per-team
 * file variable by their file name. Pure functions — no Vue, no I/O; the
 * result points at the existing slot keys, so nothing about the request
 * changes.
 *
 * A file goes to a slot only when its name (without extension) names
 * exactly one target. Everything else stays unassigned and is listed, so a
 * wrong guess never ships one person's task to another.
 */

/** One slot a file can go to, with the names that identify it. */
export interface FileTarget {
  slot: string
  /** Shown in the list, e.g. the person's name or the team name. */
  label: string
  /** Normalised names that match this target (see ``normalizeKey``). */
  keys: string[]
}

export interface MatchResult {
  /** Slot → index of the file assigned to it. */
  bySlot: Record<string, number>
  /** Indexes of files that named no target, several, or a target already taken. */
  unmatched: number[]
}

/**
 * A name made comparable: lower case, accents dropped, every run of other
 * characters a single dot — ``"Luca Bäck"``, ``"luca_baeck"`` and
 * ``"Luca.Back"`` read ``luca.back`` / ``luca.baeck``.
 */
export function normalizeKey(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '')
}

/** A file's name without its extension, normalised. */
export function fileKey(fileName: string): string {
  const dot = fileName.lastIndexOf('.')
  return normalizeKey(dot > 0 ? fileName.slice(0, dot) : fileName)
}

/** The names a person's file may carry: username, email before the @, "vorname.nachname". */
export function personKeys(person: {
  username?: string
  email?: string
  firstName?: string
  lastName?: string
}): string[] {
  const keys = [
    person.username ?? '',
    person.email?.split('@')[0] ?? '',
    person.firstName && person.lastName ? `${person.firstName}.${person.lastName}` : '',
  ].map(normalizeKey).filter(Boolean)
  return [...new Set(keys)]
}

/** Assigns ``fileNames`` to ``targets`` (see the module doc for the rule). */
export function matchFiles(fileNames: readonly string[], targets: readonly FileTarget[]): MatchResult {
  const bySlot: Record<string, number> = {}
  const unmatched: number[] = []
  fileNames.forEach((name, index) => {
    const key = fileKey(name)
    const hits = targets.filter((target) => target.keys.includes(key))
    const slot = hits.length === 1 ? hits[0]!.slot : null
    if (slot === null || slot in bySlot) unmatched.push(index)
    else bySlot[slot] = index
  })
  return { bySlot, unmatched }
}
