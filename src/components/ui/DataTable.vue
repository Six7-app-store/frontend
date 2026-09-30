<script setup lang="ts" generic="Row extends object">
/**
 * Table for lists of entities. ``columns`` define head and widths, every cell
 * renders ``row[column.id]`` unless the ``cell-<id>`` slot takes over.
 * With ``rowTo`` a row is clickable: the first cell becomes a real link that
 * covers the whole row, so keyboard and screen-reader users get it too.
 * Buttons inside a clickable row go in a column with ``interactive`` so they
 * stay above that link. The ``empty`` slot shows under the head when there
 * are no rows.
 */
import type { RouteLocationRaw } from 'vue-router'

export interface DataTableColumn {
  id: string
  label: string
  /** Width or other utility classes for the column, e.g. ``w-32``. */
  class?: string
  align?: 'left' | 'right'
  /** Visually hide the label (columns that only hold actions). */
  hideLabel?: boolean
  /** Cell holds buttons or links that must stay clickable in a clickable row. */
  interactive?: boolean
}

defineProps<{
  columns: DataTableColumn[]
  rows: Row[]
  rowKey: (row: Row) => string | number
  /** Makes rows clickable; the first cell links here. */
  rowTo?: (row: Row) => RouteLocationRaw
  /** What the table lists, for screen readers. */
  caption: string
  /** Lower rows (48 instead of 56px), for compact overviews. */
  dense?: boolean
}>()

function cellValue(row: Row, id: string): string {
  const value = (row as Record<string, unknown>)[id]
  return value === null || value === undefined ? '' : String(value)
}
</script>

<template>
  <div class="overflow-x-auto">
    <table class="data-table min-w-[36rem]" :class="{ 'data-table-dense': dense }">
      <caption class="sr-only">{{ caption }}</caption>
      <colgroup>
        <col v-for="column in columns" :key="column.id" :class="column.class" />
      </colgroup>
      <thead>
        <tr>
          <th
            v-for="column in columns"
            :key="column.id"
            scope="col"
            :class="{ 'align-right': column.align === 'right' }"
          >
            <span :class="{ 'sr-only': column.hideLabel }">{{ column.label }}</span>
          </th>
        </tr>
      </thead>
      <tbody v-if="rows.length">
        <tr v-for="row in rows" :key="rowKey(row)" :class="{ 'data-row': rowTo }">
          <td
            v-for="(column, index) in columns"
            :key="column.id"
            :class="[
              { 'align-right': column.align === 'right', 'relative z-10': column.interactive },
            ]"
          >
            <RouterLink
              v-if="rowTo && index === 0"
              :to="rowTo(row)"
              class="row-link block truncate"
            >
              <slot :name="`cell-${column.id}`" :row="row">{{ cellValue(row, column.id) }}</slot>
            </RouterLink>
            <slot v-else :name="`cell-${column.id}`" :row="row">{{ cellValue(row, column.id) }}</slot>
          </td>
        </tr>
      </tbody>
    </table>
    <slot v-if="!rows.length" name="empty" />
  </div>
</template>
