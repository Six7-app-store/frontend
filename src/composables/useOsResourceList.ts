import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { openstackResourcesApi, type OsResourceType } from '@/api/openstack-resources.api'
import { listOsResources, type ListOptions } from '@/api/openstack-resource-list'
import { adaptResource, type ResourceItem } from '@/services/openstack-resource-presentation.service'
import { getErrorDetailMessage, openStackFailure } from '@/utils/http-error'
import {
  prime as primeDisplayCache,
  invalidate as invalidateDisplayCache,
} from '@/composables/useOpenStackResourceCache'

/**
 * The resources one picker offers, with its load state. A failed load
 * leaves the list empty and says why: ``credentials_missing`` (412) or
 * ``unavailable`` with a message to show.
 */
export function useOsResourceList(source: () => { type: OsResourceType } & ListOptions) {
  const { t } = useI18n()
  const items = ref<ResourceItem[]>([])
  const isLoading = ref(false)
  const errorReason = ref<'credentials_missing' | 'unavailable' | null>(null)
  const errorMessage = ref('')

  /**
   * Loads the list. ``forceRefresh`` first drops the backend's cache and the
   * shared display cache for the type; that step is best effort, the load
   * reports its own error when OpenStack is really unreachable.
   */
  async function load(opts: { forceRefresh?: boolean } = {}) {
    const { type, ...options } = source()
    isLoading.value = true
    errorReason.value = null
    errorMessage.value = ''
    try {
      if (opts.forceRefresh) {
        try {
          await openstackResourcesApi.refresh(type)
        } catch (err) {
          console.warn('[OsPicker] refresh failed:', err)
        }
        invalidateDisplayCache(type)
      }
      const raw = await listOsResources(type, options)
      items.value = raw.map((r) => adaptResource(type, r, t))
      // Only an unfiltered list may feed the display cache the other pickers
      // and the summary read; a per-network subnet list would pollute it.
      if (!options.networkId) primeDisplayCache(type, raw)
    } catch (err) {
      const failure = openStackFailure(err)
      if (failure === 'credentials_missing') {
        errorReason.value = 'credentials_missing'
      } else {
        errorReason.value = 'unavailable'
        errorMessage.value = failure === 'unavailable'
          ? getErrorDetailMessage(err) ?? t('openstackPicker.osError')
          : t('openstackPicker.loadError')
      }
      items.value = []
    } finally {
      isLoading.value = false
    }
  }

  return { items, isLoading, errorReason, errorMessage, load }
}
