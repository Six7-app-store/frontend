/**
 * Rules of the "My Access" page: which deployments are worth asking
 * ``/my-access`` for, and how one response becomes one access entry.
 * Pure functions — no Vue, no I/O.
 */
import type { Deployment, MyAccessResponse } from '@/types'
import type { AccountMatch } from '@/services/deployment-account-matching.service'
import type { TeamVm, UserAccount } from '@/services/deployment-outputs.service'

/** One deployment together with the caller's own credentials. */
export interface MyAccessEntry {
  deploymentId: string
  name: string
  appId: string
  account: AccountMatch
  teamVm: TeamVm | null
}

/**
 * Only a finished deployment has credentials. Anything still in flight
 * or broken would just cost a request that comes back empty.
 */
export function isAccessReady(deployment: Pick<Deployment, 'status'>): boolean {
  return deployment.status === 'success'
}

/**
 * Turn one ``/my-access`` response into an entry, or ``null`` when the
 * caller has no account there (the app issues none, or the caller is
 * not a member). The backend filters both maps to the caller's own
 * entry, so the first key is the only one.
 */
export function toMyAccessEntry(
  deployment: Pick<Deployment, 'deploymentId' | 'name' | 'appId'>,
  response: MyAccessResponse | null | undefined,
): MyAccessEntry | null {
  const [key, data] = Object.entries(response?.user_accounts ?? {})[0] ?? []
  if (!key || !data) return null
  const teamVm = Object.values(response?.team_vms ?? {})[0] ?? null
  return {
    deploymentId: deployment.deploymentId,
    name: deployment.name,
    appId: deployment.appId,
    // The API type marks fields optional; the local UserAccount is
    // stricter but structurally compatible at the point of use.
    account: { key, data: data as unknown as UserAccount },
    teamVm,
  }
}
