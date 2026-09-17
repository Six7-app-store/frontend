/**
 * Helpers for the deployment wizard's variable values (``draft.variables``).
 * Pure functions — no Vue, no I/O.
 */

/**
 * Multi-image Packer layout: such apps store Packer values nested under
 * ``variables.packer[<template_key>][<name>]`` instead of flat under
 * ``variables[<name>]``. Detected by ``packer`` being a non-empty object whose
 * every entry is itself a (non-array) object. Used by the summary view and by
 * ``submitDraft`` so both read the values the same way.
 */
export function isMultiImagePackerLayout(variables: unknown): boolean {
  const packer = (variables as Record<string, any> | null | undefined)?.packer
  if (!packer || typeof packer !== 'object' || Array.isArray(packer)) return false
  const keys = Object.keys(packer)
  if (keys.length === 0) return false
  return keys.every((k) => {
    const slot = packer[k]
    return !!slot && typeof slot === 'object' && !Array.isArray(slot)
  })
}
