import type { RouteLocationRaw } from 'vue-router'

/** One step of a ``Breadcrumb`` trail. Without ``to`` it is not a link. */
export interface Crumb {
  label: string
  to?: RouteLocationRaw
}
