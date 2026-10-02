import type { Component } from 'vue'

/** One tab of a ``TabBar``. */
export interface Tab<K extends string = string> {
  key: K
  label: string
  icon?: Component
}

/** Id of a ``TabBar`` tab with ``idPrefix``; its panel is labelled by it. */
export function tabId(prefix: string, key: string): string {
  return `${prefix}-tab-${key}`
}

/** Id of the panel a ``TabBar`` tab with ``idPrefix`` controls. */
export function panelId(prefix: string, key: string): string {
  return `${prefix}-panel-${key}`
}
