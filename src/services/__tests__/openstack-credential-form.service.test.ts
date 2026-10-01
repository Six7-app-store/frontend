import { describe, it, expect } from 'vitest'
import {
  buildCredentialPayload,
  emptyAppForm,
  emptyPasswordForm,
  formFromCloudsYaml,
  formFromStatus,
} from '@/services/openstack-credential-form.service'
import type { ParsedCloudsYaml } from '@/utils/clouds-yaml'

const status = (extra: Record<string, unknown>) =>
  ({ has_credential: true, is_locked: false, active_deployments: 0, ...extra }) as any

describe('formFromStatus', () => {
  it('opens the app tab with URL and region for an application credential', () => {
    expect(formFromStatus(status({ auth_type: 'v3applicationcredential', auth_url: 'https://ks', region_name: null })))
      .toEqual({ tab: 'app', fields: { auth_url: 'https://ks', region_name: '' } })
  })

  it('fills the project fields for a password credential and defaults the user domain', () => {
    expect(formFromStatus(status({ auth_type: 'password', auth_url: 'https://ks', project_name: 'lab' })))
      .toEqual({
        tab: 'password',
        fields: {
          auth_url: 'https://ks', region_name: '', project_id: '', project_name: 'lab',
          user_domain_name: 'Default', project_domain_name: '',
        },
      })
  })
})

describe('formFromCloudsYaml', () => {
  const parsed = (extra: Partial<ParsedCloudsYaml>): ParsedCloudsYaml => ({
    cloud_name: 'c', auth_type: 'password', auth_url: 'u', region_name: 'r', interface: 'public',
    identity_api_version: '3', identifier: 'id', secret: 's', project_id: '', project_name: 'p',
    user_domain_name: '', project_domain_name: 'd', ...extra,
  })

  it('takes identifier and secret too', () => {
    expect(formFromCloudsYaml(parsed({ auth_type: 'v3applicationcredential' })))
      .toEqual({ tab: 'app', fields: { auth_url: 'u', region_name: 'r', identifier: 'id', secret: 's' } })
  })

  it('defaults an empty user domain', () => {
    expect(formFromCloudsYaml(parsed({})).fields.user_domain_name).toBe('Default')
  })
})

describe('buildCredentialPayload', () => {
  it('needs URL, identifier and secret for an application credential', () => {
    expect(buildCredentialPayload('app', { ...emptyAppForm(), auth_url: 'u', identifier: 'i' }, emptyPasswordForm())).toBeNull()
    expect(buildCredentialPayload('app', { auth_url: 'u', region_name: '', identifier: 'i', secret: 's' }, emptyPasswordForm()))
      .toEqual({
        auth_type: 'v3applicationcredential', auth_url: 'u', region_name: null, interface: 'public',
        identity_api_version: '3', identifier: 'i', secret: 's',
      })
  })

  it('needs a project by id or name for a password credential', () => {
    const pwd = { ...emptyPasswordForm(), auth_url: 'u', identifier: 'i', secret: 's' }
    expect(buildCredentialPayload('password', emptyAppForm(), pwd)).toBeNull()
    expect(buildCredentialPayload('password', emptyAppForm(), { ...pwd, project_name: 'lab' }))
      .toMatchObject({ auth_type: 'password', project_id: null, project_name: 'lab', user_domain_name: 'Default', project_domain_name: null })
  })
})
