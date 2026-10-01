/**
 * Reads the wizard input persisted on a deployment (``userInputVar``) for
 * the detail page: the student groups and the configuration variables.
 * ``userInputVar`` may arrive as a JSON string or as an already-parsed
 * object. Pure functions — no Vue, no I/O.
 */

type UserInputVar = string | Record<string, any> | null | undefined

export interface DeploymentGroup {
  /** Numeric key from ``assignments``. */
  index: number
  name: string
  students: string[]
}

/**
 * ``userInputVar`` as an object: a plain object passes through, a non-empty
 * string is parsed as JSON (throws on malformed JSON), anything else is ``{}``.
 */
export function parseUserInputVar(userInputVar: unknown): Record<string, any> {
  if (userInputVar && typeof userInputVar === 'object' && !Array.isArray(userInputVar)) {
    return userInputVar as Record<string, any>
  }
  if (typeof userInputVar === 'string' && userInputVar.trim() !== '') {
    return JSON.parse(userInputVar)
  }
  return {}
}

export function parseDeploymentGroups(userInputVar: UserInputVar): DeploymentGroup[] {
  if (!userInputVar) return []

  try {
    const data = parseUserInputVar(userInputVar)
    const groupNames = data.groupNames || []
    const assignments = data.assignments || {}

    // The assignment key is the group's index into ``groupNames``; keys may
    // have gaps, so the position in ``assignments`` is not used.
    return Object.keys(assignments).map((groupIndex) => ({
      index: parseInt(groupIndex),
      name: groupNames[parseInt(groupIndex)] || `Gruppe ${parseInt(groupIndex) + 1}`,
      students: assignments[groupIndex] || []
    }))
  } catch (e) {
    // Malformed wizard input: render the section as empty instead of failing.
    console.error('Error parsing userInputVar:', e)
    return []
  }
}

export function parseDeploymentVariables(userInputVar: UserInputVar): Record<string, any> {
  if (!userInputVar) return {}

  try {
    const data = parseUserInputVar(userInputVar)
    return data.variables || {}
  } catch (e) {
    // Malformed wizard input: render the section as empty instead of failing.
    console.error('Error parsing userInputVar:', e)
    return {}
  }
}

/** Strips a trailing ``# comment`` and quotes from a variable value; empty → ``-``. */
export function cleanVariableValue(value?: string): string {
  const str = String(value ?? '')
  let cleaned = str.split('#')[0]?.trim() ?? ''
  cleaned = cleaned.replace(/["']/g, '')
  return cleaned.trim() || '-'
}
