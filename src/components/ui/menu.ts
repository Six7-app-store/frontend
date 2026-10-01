import type { Component } from 'vue'

/** One entry of an ``ActionMenu``. */
export interface MenuItem {
  id: string
  label: string
  icon?: Component
  /** Destructive: grey until hovered, then red. */
  danger?: boolean
  disabled?: boolean
}
