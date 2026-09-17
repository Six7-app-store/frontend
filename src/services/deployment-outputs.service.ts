/**
 * Terraform-output parsing for the deployment detail page.
 *
 * A task's ``outputs`` hold the per-user credentials (``user_accounts``) and
 * the team-level VM metadata (``team_vms``). They may arrive as a raw JSON
 * string from the DB or as an already-parsed object, and the actual map sits
 * under ``.value`` because Terraform stamps the output shape on the wrapper.
 *
 * Members have no task outputs; both extractors therefore take the
 * ``/my-access`` data as a fallback.
 */
import type { Task } from '@/types'

// Structure of a single account.
export interface UserAccount {
  username: string
  team: string
  ip: string
  port: number
  auth: string
  type?: 'password' | 'ssh_key' | 'oauth' | 'none' | string
  authtype?: 'ssh' | 'url' | string
  url?: string
}

/** One entry of terraform's ``team_vms`` output. */
export interface TeamVm {
  url?: string
  floating_ip?: string
  fixed_ip?: string
}

type RawOutputs = NonNullable<Task['outputs']>

/**
 * Parse ``outputs`` into an object when they arrive as a JSON string.
 * Strings that don't look like a JSON object are passed through unchanged;
 * a JSON-looking string that fails to parse yields ``{ error }``.
 */
function parseRawOutputs(rawOutputs: RawOutputs): { parsed: any } | { error: unknown } {
  let outputsObj: any = rawOutputs

  // Case 1: outputs arrive as a JSON string from the DB text column.
  if (typeof rawOutputs === 'string') {
    try {
      const trimmed = rawOutputs.trim()
      if (trimmed.startsWith('{')) {
        outputsObj = JSON.parse(trimmed)
      }
    } catch (e) {
      return { error: e }
    }
  }
  return { parsed: outputsObj }
}

/**
 * Pull the ``user_accounts`` map out of a task's outputs, falling back to
 * the member's own ``/my-access`` accounts when there is nothing usable.
 */
export function extractUserAccounts(
  rawOutputs: Task['outputs'] | undefined,
  fallback: Record<string, UserAccount> | null,
): Record<string, UserAccount> | null {
  // Member fallback: non-owners have no task outputs (the owner-only
  // task endpoint 403s / is skipped), so use the per-user credentials
  // fetched from ``/my-access``. Already in the ``user_accounts.value``
  // shape, so it feeds the matching pipeline directly.
  if (!rawOutputs) return fallback

  const result = parseRawOutputs(rawOutputs)
  if ('error' in result) {
    console.error('Failed to parse raw outputs data:', result.error)
    return fallback
  }
  const outputsObj = result.parsed

  // Case 2: it is already an object (or was parsed successfully above).
  if (outputsObj && typeof outputsObj === 'object' && 'user_accounts' in outputsObj) {
    const userAccountsContainer = outputsObj.user_accounts

    // Reach through to the Terraform ``.value`` object.
    if (userAccountsContainer && userAccountsContainer.value) {
      return userAccountsContainer.value as Record<string, UserAccount>
    }
  }

  return fallback
}

/**
 * Pull the ``team_vms`` object out of the active task's outputs. Same
 * unwrap chain as :func:`extractUserAccounts` — the outputs may arrive as a
 * raw JSON string from the DB or as an already-parsed object, and the
 * actual map sits under ``.value`` because Terraform stamps the output
 * shape on the wrapper. Returns the fallback (``null`` for owners) if
 * anything along the way isn't there.
 */
export function extractTeamVms(
  rawOutputs: Task['outputs'] | undefined,
  fallback: Record<string, TeamVm> | null,
): Record<string, TeamVm> | null {
  // Member fallback: use the team VM block from ``/my-access`` so a
  // non-owner still gets the Web-URL pill (SSH/PW render even without it).
  if (!rawOutputs) return fallback

  const result = parseRawOutputs(rawOutputs)
  if ('error' in result) return fallback
  const vms = result.parsed?.team_vms?.value
  return vms && typeof vms === 'object' ? vms : fallback
}
