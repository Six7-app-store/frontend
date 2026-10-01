import { computed, onBeforeUnmount, ref, watchEffect } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useRole } from '@/composables/useRole'
import { buildBreadcrumbs } from '@/services/breadcrumb.service'

// The name a detail page shows (app, course, deployment). One page is open at
// a time, so a module-level ref is enough to hand it to the topbar.
const entityLabel = ref<string | null>(null)

/** The breadcrumb trail of the current route, for the topbar. */
export function useBreadcrumbs() {
  const route = useRoute()
  const { t } = useI18n()
  const { isStudent } = useRole()

  const items = computed(() =>
    buildBreadcrumbs({
      routeName: route.name,
      entityLabel: entityLabel.value,
      isStudent: isStudent.value,
      t,
    }),
  )

  return { items }
}

/** Detail pages call this with the entity's name; it is cleared when the page closes. */
export function useBreadcrumbEntity(name: () => string | null | undefined) {
  watchEffect(() => {
    entityLabel.value = name() ?? null
  })
  onBeforeUnmount(() => {
    entityLabel.value = null
  })
}
