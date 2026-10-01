import type { Component } from 'vue'

/** One option of a ``SegmentedControl``. */
export interface SegmentOption<K extends string = string> {
  value: K
  label: string
  icon?: Component
}
