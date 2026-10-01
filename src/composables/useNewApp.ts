import { ref } from 'vue'
import { appApi } from '@/api/app.api'
import { readFileAsDataUrl } from '@/utils/file'

export interface NewAppForm {
  name: string
  description: string
  repoUrl: string
  isPrivate: boolean
  submitAllVersions: boolean
}

/**
 * Registering a new app: the link to this installation's GitHub App, and
 * the create request built from the form.
 */
export function useNewApp() {
  // Every installation runs its own GitHub App, so the link comes from the
  // backend. Stays null when none is configured or it can't be loaded.
  const githubAppInstallUrl = ref<string | null>(null)

  async function loadGithubAppInstallUrl() {
    try {
      githubAppInstallUrl.value = (await appApi.getGithubApp()).data.install_url
    } catch {
      githubAppInstallUrl.value = null
    }
  }

  /**
   * Creates the app; throws on failure. The logo travels as a data URL. A
   * private app is never submitted to the store, whatever the checkbox says.
   */
  async function create(form: NewAppForm, logo: File | null) {
    const image = logo ? await readFileAsDataUrl(logo) : null
    await appApi.create({
      name: form.name,
      description: form.description,
      git_link: form.repoUrl,
      image,
      is_private: form.isPrivate,
      submit_all_versions: !form.isPrivate && form.submitAllVersions,
    })
  }

  return { githubAppInstallUrl, loadGithubAppInstallUrl, create }
}
