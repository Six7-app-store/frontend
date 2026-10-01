import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useDeploymentStore } from '@/stores/deployment.store'
import { distributeEvenly } from '@/services/deployment-draft.service'
import {
  canProceed,
  moveStudent,
  shuffled,
  unassignedIds,
} from '@/services/team-assignment.service'

/**
 * State of the wizard's team-assignment step on top of the deployment
 * draft: the group mode, the number and names of the teams, and who sits
 * where. Everything is written straight into ``deploymentStore.draft``.
 */
export function useTeamAssignment() {
  const { t } = useI18n()
  const store = useDeploymentStore()

  const assignments = () => store.draft.assignments as unknown as string[][]
  const setAssignments = (next: string[][]) => {
    store.draft.assignments = next as unknown as Record<number, string[]>
  }
  const defaultName = (index: number) => t('deployment.assignment.vmDefaultName', { index: index + 1 })

  const groupNames = ref<string[]>(store.draft.groupNames || [])
  watch(groupNames, (names) => {
    store.draft.groupNames = names
  }, { deep: true })

  const groupCount = computed({
    get: () => store.draft.groupCount,
    set: (count) => { store.draft.groupCount = count },
  })
  const totalStudents = computed(() => store.draft.studentIds.length)
  const mode = computed(() => store.draft.groupMode)
  const unassigned = computed(() => unassignedIds(store.draft.studentIds, assignments() ?? []))
  const teams = computed(() => assignments().slice(0, groupCount.value))
  const complete = computed(() =>
    canProceed(assignments(), groupNames.value, groupCount.value, unassigned.value.length),
  )

  /** Keeps every name the user typed (default names too) and fills the empty ones. */
  function ensureDefaultGroupNames() {
    const current = groupNames.value
    groupNames.value = []
    for (let i = 0; i < groupCount.value; i++) {
      const name = current[i]
      groupNames.value[i] = name && name.trim() !== '' ? name : defaultName(i)
    }
  }

  // True for an empty name and for the generated default names ("Team #n"),
  // so switching the mode never overwrites a name the user typed.
  function isDefaultGroupName(name: string | undefined) {
    if (!name || name.trim() === '') return true
    const count = Math.max(groupNames.value.length, 1)
    for (let i = 0; i < count; i++) {
      if (name === defaultName(i)) return true
    }
    return false
  }

  function ensureAssignmentArrays() {
    const current = assignments()
    for (let i = 0; i < store.draft.groupCount; i++) {
      if (!current[i]) current[i] = []
      if (groupNames.value[i] === undefined) groupNames.value[i] = ''
    }
  }

  watch(groupCount, (newCount, oldCount) => {
    ensureAssignmentArrays()
    if (typeof oldCount !== 'number') return
    // New teams get a default name, removed teams lose theirs; the students
    // of a removed team go back to the pool.
    for (let i = oldCount; i < newCount; i++) {
      if (!groupNames.value[i]?.trim()) groupNames.value[i] = defaultName(i)
    }
    if (oldCount > newCount) {
      assignments().length = newCount
      groupNames.value.length = newCount
    }
  })

  /** Brings a draft coming from the config step into a consistent shape. */
  function prepare() {
    if (!store.draft.groupCount || store.draft.groupCount < 1) store.draft.groupCount = 1
    ensureAssignmentArrays()
    ensureDefaultGroupNames()
  }

  function setOneGroup() {
    store.draft.groupMode = 'one'
    store.draft.groupCount = 1
    assignments()[0] = [...store.draft.studentIds]
    if (isDefaultGroupName(groupNames.value[0])) groupNames.value[0] = defaultName(0)
    groupNames.value.length = 1
  }

  function setEachUser() {
    store.draft.groupMode = 'eachUser'
    store.draft.groupCount = totalStudents.value
    const current = assignments()
    store.draft.studentIds.forEach((studentId, i) => {
      current[i] = [studentId]
      groupNames.value[i] = defaultName(i)
    })
  }

  function setCustom() {
    store.draft.groupMode = 'custom'
    if (store.draft.groupCount === 1 && totalStudents.value > 1) store.draft.groupCount = 2
    ensureDefaultGroupNames()
  }

  function increment() {
    if (store.draft.groupCount < totalStudents.value) store.draft.groupCount++
  }

  function decrement() {
    if (store.draft.groupCount > 1) store.draft.groupCount--
  }

  /** Moves a student into team ``target``, or back into the pool for ``null``. */
  function moveTo(studentId: string, target: number | null) {
    setAssignments(moveStudent(assignments(), studentId, target))
  }

  function shuffle(random: () => number = Math.random) {
    const current = assignments()
    distributeEvenly(shuffled(store.draft.studentIds, random), store.draft.groupCount)
      .forEach((team, i) => { current[i] = team })
  }

  function clearAll() {
    const current = assignments()
    for (let i = 0; i < store.draft.groupCount; i++) current[i] = []
  }

  return {
    groupNames,
    groupCount,
    totalStudents,
    mode,
    unassigned,
    teams,
    complete,
    prepare,
    setOneGroup,
    setEachUser,
    setCustom,
    increment,
    decrement,
    moveTo,
    shuffle,
    clearAll,
  }
}
