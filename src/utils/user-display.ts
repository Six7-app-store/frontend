/**
 * How a person is named in lists: full name, else username, else email,
 * else ``fallback`` (usually their id, so an unloaded entry still shows
 * something that tells two people apart).
 */
export interface NamedUser {
  firstName?: string | null
  lastName?: string | null
  username?: string | null
  email?: string | null
  name?: string | null
}

export function userDisplayName(user: NamedUser | null | undefined, fallback: string): string {
  if (!user) return fallback
  if (user.firstName || user.lastName) {
    return `${user.firstName || ''} ${user.lastName || ''}`.trim()
  }
  return user.username || user.email || user.name || fallback
}
