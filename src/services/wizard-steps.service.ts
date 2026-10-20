/**
 * The steps of the deployment wizard and when a step may be left forward.
 * Pure functions — no Vue, no I/O.
 *
 * "Neues Deployment" opens all three steps; an app page has already chosen
 * app and version and opens only the last two.
 */
import type { DeploymentDraft, WizardEntry } from '@/types'

export type WizardStep = 'app' | 'target' | 'start'

const STEPS: Record<WizardEntry, readonly WizardStep[]> = {
  catalog: ['app', 'target', 'start'],
  app: ['target', 'start'],
}

export const stepsFor = (entry: WizardEntry): readonly WizardStep[] => STEPS[entry] ?? STEPS.catalog

export const isWizardStep = (value: unknown): value is WizardStep =>
  value === 'app' || value === 'target' || value === 'start'

/**
 * Why ``step`` cannot be left forward yet, as an i18n key, or ``null``.
 *
 * Only what the draft alone decides: a later step also needs everything an
 * earlier one asks for, so a deep link never lands behind a gap. The start
 * step adds its own reasons (required inputs and files), which need the
 * loaded variable definitions.
 */
export function draftBlockReason(step: WizardStep, draft: DeploymentDraft): string | null {
  if (!draft.appId) return 'deployment.wizard.block.noApp'
  if (!draft.releaseTag) return 'deployment.wizard.block.noVersion'
  if (step === 'app') return null

  if (draft.studentIds.length === 0) return 'deployment.wizard.block.noStudents'
  if (!draft.name.trim()) return 'deployment.wizard.block.noName'
  return null
}

/**
 * The step a deep link or reload may show at most: the first one that is
 * not complete yet, or the last step when all are.
 */
export function furthestReachableStep(steps: readonly WizardStep[], draft: DeploymentDraft): WizardStep {
  for (const step of steps) {
    if (draftBlockReason(step, draft) !== null) return step
  }
  return steps[steps.length - 1]!
}

/** Whether ``step`` may be shown for this draft and entry. */
export function canShowStep(step: WizardStep, draft: DeploymentDraft): boolean {
  const steps = stepsFor(draft.entry)
  const index = steps.indexOf(step)
  return index >= 0 && index <= steps.indexOf(furthestReachableStep(steps, draft))
}
