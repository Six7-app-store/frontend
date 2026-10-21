import { ref } from 'vue'
import { deploymentApi } from '@/api/deployment.api'
import { isAccessReady, toMyAccessEntry, type MyAccessEntry } from '@/services/my-access.service'

/**
 * The caller's own credentials across all their deployments, for the
 * "My Access" page.
 *
 * The backend has no bulk endpoint, so this is one ``/my-access``
 * request per finished deployment. That endpoint is also what keeps the
 * page to authorised data: it answers with the caller's own entry only,
 * and with 403 where the caller has no access — such a deployment is
 * left out instead of failing the page.
 */
export function useMyAccess() {
  const entries = ref<MyAccessEntry[]>([])
  const isLoading = ref(false)
  const loadFailed = ref(false)

  async function load() {
    isLoading.value = true
    loadFailed.value = false
    try {
      const { data: deployments } = await deploymentApi.list()
      const loaded = await Promise.all(deployments.filter(isAccessReady).map(async (deployment) => {
        try {
          const { data } = await deploymentApi.getMyAccess(deployment.deploymentId)
          return toMyAccessEntry(deployment, data)
        } catch (err) {
          console.error('Error loading own access credentials:', err)
          return null
        }
      }))
      entries.value = loaded.filter((entry): entry is MyAccessEntry => entry !== null)
    } catch (err) {
      console.error('Error loading deployments for My Access:', err)
      entries.value = []
      loadFailed.value = true
    } finally {
      isLoading.value = false
    }
  }

  return { entries, isLoading, loadFailed, load }
}
