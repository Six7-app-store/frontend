/**
 * The two OpenStack credential forms (application credential, password)
 * of the settings page: filling them from the stored status or an
 * uploaded clouds.yaml, and the request built from them. Pure functions —
 * no Vue, no I/O.
 */
import type { ParsedCloudsYaml } from '@/utils/clouds-yaml'
import type {
  OpenStackCredentialResponse,
  OpenStackCredentialUpsert,
} from '@/types/openstack-credential'

export type CredentialTab = 'app' | 'password'

export interface AppCredentialForm {
  auth_url: string
  region_name: string
  identifier: string
  secret: string
}

export interface PasswordCredentialForm extends AppCredentialForm {
  project_id: string
  project_name: string
  user_domain_name: string
  project_domain_name: string
}

export const emptyAppForm = (): AppCredentialForm => ({
  auth_url: '',
  region_name: '',
  identifier: '',
  secret: '',
})

export const emptyPasswordForm = (): PasswordCredentialForm => ({
  ...emptyAppForm(),
  project_id: '',
  project_name: '',
  user_domain_name: 'Default',
  project_domain_name: '',
})

/**
 * The tab and the non-secret fields to show for stored credentials. The
 * identifier and secret are never sent back, so they stay empty.
 */
export function formFromStatus(
  status: OpenStackCredentialResponse,
): { tab: CredentialTab; fields: Partial<PasswordCredentialForm> } {
  if (status.auth_type === 'v3applicationcredential') {
    return { tab: 'app', fields: { auth_url: status.auth_url ?? '', region_name: status.region_name ?? '' } }
  }
  return {
    tab: 'password',
    fields: {
      auth_url: status.auth_url ?? '',
      region_name: status.region_name ?? '',
      project_id: status.project_id ?? '',
      project_name: status.project_name ?? '',
      user_domain_name: status.user_domain_name ?? 'Default',
      project_domain_name: status.project_domain_name ?? '',
    },
  }
}

/** The tab and all fields a parsed clouds.yaml fills in, secret included. */
export function formFromCloudsYaml(
  parsed: ParsedCloudsYaml,
): { tab: CredentialTab; fields: Partial<PasswordCredentialForm> } {
  const common = {
    auth_url: parsed.auth_url,
    region_name: parsed.region_name,
    identifier: parsed.identifier,
    secret: parsed.secret,
  }
  if (parsed.auth_type === 'v3applicationcredential') return { tab: 'app', fields: common }
  return {
    tab: 'password',
    fields: {
      ...common,
      project_id: parsed.project_id,
      project_name: parsed.project_name,
      user_domain_name: parsed.user_domain_name || 'Default',
      project_domain_name: parsed.project_domain_name,
    },
  }
}

/**
 * The save request for the active tab, or ``null`` while a required field
 * is missing. A password credential needs a project, by id or by name.
 */
export function buildCredentialPayload(
  tab: CredentialTab,
  app: AppCredentialForm,
  pwd: PasswordCredentialForm,
): OpenStackCredentialUpsert | null {
  if (tab === 'app') {
    if (!app.auth_url || !app.identifier || !app.secret) return null
    return {
      auth_type: 'v3applicationcredential',
      auth_url: app.auth_url,
      region_name: app.region_name || null,
      interface: 'public',
      identity_api_version: '3',
      identifier: app.identifier,
      secret: app.secret,
    }
  }
  if (!pwd.auth_url || !pwd.identifier || !pwd.secret || !pwd.user_domain_name) return null
  if (!pwd.project_id && !pwd.project_name) return null
  return {
    auth_type: 'password',
    auth_url: pwd.auth_url,
    region_name: pwd.region_name || null,
    interface: 'public',
    identity_api_version: '3',
    identifier: pwd.identifier,
    secret: pwd.secret,
    project_id: pwd.project_id || null,
    project_name: pwd.project_name || null,
    user_domain_name: pwd.user_domain_name,
    project_domain_name: pwd.project_domain_name || null,
  }
}
