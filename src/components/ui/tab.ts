import type { Component } from 'vue'

/** One tab of a ``TabBar``. */
export interface Tab<K extends string = string> {
  key: K
  label: string
  icon?: Component
}
