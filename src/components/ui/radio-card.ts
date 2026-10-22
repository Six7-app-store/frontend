/** One option of a ``RadioCardGroup``. */
export interface RadioCardOption<V extends string = string> {
  value: V
  label: string
  /** Short tag next to the label, e.g. "Empfohlen für diese App". */
  badge?: string
  description?: string
  /** What choosing it leads to, e.g. "1 Umgebung für 9 Personen". */
  result?: string
}
