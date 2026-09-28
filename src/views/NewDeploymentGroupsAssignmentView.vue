<script setup lang="ts">
import { ROUTE_NAMES } from '@/router/route-names'
import { ref, computed, onMounted, watch, reactive, nextTick } from 'vue'
import { userApi } from '@/api/user.api'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useDeploymentStore } from '@/stores/deployment.store'
import DeploymentProgressBar from '@/components/DeploymentProgressBar.vue'
import { userDisplayName } from '@/utils/user-display'
import { distributeEvenly } from '@/services/deployment-draft.service'
import { Plus, Minus, Users, ArrowLeft, ArrowRight, GripVertical, Trash2, UserPlus, Shuffle, X } from 'lucide-vue-next'

const { t } = useI18n()
const router = useRouter()
const store = useDeploymentStore()

// --- Reactive cache wrapper ---
const studentCacheMap = store.studentCache ?? new Map<string, any>()
const studentCache = reactive<Record<string, any>>({})

function syncStudentCacheToReactive() {
  for (const [id, val] of studentCacheMap.entries()) {
    studentCache[id] = val
  }
}

syncStudentCacheToReactive()

function setStudentCache(id: string, val: any) {
  studentCacheMap.set(id, val)
  studentCache[id] = val
}

// --- State ---
const activeGroupIndex = ref(0) 
const draggedStudent = ref<string | null>(null)
const dragOverGroup = ref<number | null>(null)
const dragOverUnassigned = ref(false)

const groupNames = ref<string[]>(store.draft.groupNames || [])

watch(groupNames, (newVal) => {
  store.draft.groupNames = newVal
}, { deep: true })

const totalStudents = computed(() => store.draft.studentIds.length)

const groupCount = computed({
  get: () => store.draft.groupCount,
  set: (val) => store.draft.groupCount = val
})

const mode = computed(() => store.draft.groupMode)
const showControls = computed(() => mode.value === 'custom')

const unassignedStudents = computed(() => {
  const assigned = new Set<string>()
  const assignments = store.draft.assignments as string[][]
  if (assignments && Array.isArray(assignments)) {
    assignments.forEach((group: string[]) => {
      if (group) group.forEach((id: string) => assigned.add(id))
    })
  }
  return store.draft.studentIds.filter((id: string) => !assigned.has(id))
})

// --- Helper Functions ---
function ensureDefaultGroupNames() {
  const currentNames = groupNames.value
  groupNames.value = []
  for (let i = 0; i < groupCount.value; i++) {
    const currentName = currentNames[i]
    
    // Keep existing names (even if they are default names).
    if (currentName && currentName.trim() !== '') {
      groupNames.value[i] = currentName
    } else {
      // Set default names only for new/empty groups via i18n.
      groupNames.value[i] = t('deployment.assignment.vmDefaultName', { index: i + 1 })
    }
  }
}

// True for an empty name and for the generated default names ("Team #n"),
// so switching the mode never overwrites a name the user typed.
function isDefaultGroupName(name: string | undefined) {
  if (!name || name.trim() === '') return true
  const count = Math.max(groupNames.value.length, 1)
  for (let i = 0; i < count; i++) {
    if (name === t('deployment.assignment.vmDefaultName', { index: i + 1 })) return true
  }
  return false
}

const ensureAssignmentArrays = () => {
  const assignments = store.draft.assignments as string[][]
  for (let i = 0; i < store.draft.groupCount; i++) {
    if (!assignments[i]) assignments[i] = []
    if (groupNames.value[i] === undefined) groupNames.value[i] = ''
  }
}

// --- Watchers ---
watch(groupCount, (newCount, oldCount) => {
  ensureAssignmentArrays()
  
  // Add default names only for new groups.
  if (typeof oldCount === 'number' && newCount > oldCount) {
    for (let i = oldCount; i < newCount; i++) {
      if (!groupNames.value[i] || groupNames.value[i]?.trim() === '') {
        groupNames.value[i] = t('deployment.assignment.vmDefaultName', { index: i + 1 })
      }
    }
  }
  
  if (activeGroupIndex.value >= newCount) activeGroupIndex.value = Math.max(0, newCount - 1)

  if (typeof oldCount === 'number' && oldCount > newCount) {
    const assignments = store.draft.assignments as string[][]
    assignments.length = newCount
    // Also remove the names for removed teams.
    groupNames.value.length = newCount
  }
}, { immediate: false })

// --- Lifecycle ---
onMounted(async () => {
  if (!store.draft.studentIds || store.draft.studentIds.length === 0) {
    router.replace({ name: ROUTE_NAMES.deploymentConfig })
    return
  }
  if (!store.draft.groupCount || store.draft.groupCount < 1) {
    store.draft.groupCount = 1
  }
  ensureAssignmentArrays()
  
  // Ensure all groups have names.
  ensureDefaultGroupNames()
  
  const assignments = store.draft.assignments as string[][]
  const assignedIds: string[] = assignments 
    ? ([] as string[]).concat(...assignments.filter((arr): arr is string[] => Array.isArray(arr) && arr.length > 0))
    : []
    
  const allIds = Array.from(new Set<string>([
    ...(store.draft.studentIds ?? []),
    ...assignedIds,
    ...unassignedStudents.value
  ]))
  
  // Draft student IDs are ``userId``s, and so is the cache key. The loop
  // below still scans the cached objects, because an entry can have been
  // stored under a different key by an earlier step and is then cheaper to
  // reuse than to fetch again.
  const missingIds: string[] = []
  for (const id of allIds) {
    const cached = studentCache[id]
    const needsUpdate = !cached || (!cached.firstName && !cached.lastName && !cached.username && !cached.email)
    if (needsUpdate) {
      let found = null
      for (const key in studentCache) {
        const s = studentCache[key]
        if (s && s.userId === id && (s.firstName || s.lastName || s.username || s.email)) {
          found = s
          break
        }
      }
      if (found) {
        setStudentCache(id, found)
      } else {
        missingIds.push(id)
        if (!cached) setStudentCache(id, { userId: id })
      }
    }
  }
  
  if (missingIds.length > 0) {
    // A user that can't be loaded is skipped silently: the placeholder cache
    // entry set above keeps the assignment UI usable.
    const results = await Promise.all(missingIds.map(id => userApi.getById(id).then(res => res.data).catch(() => null)))
    // Cache under the requested ID — that's the key the template looks up.
    results.forEach((user, i) => {
      if (user && user.userId) {
        setStudentCache(missingIds[i]!, user)
      }
    })
    await nextTick()
  }
})

// --- Mode Functions ---
const setOneGroup = () => {
  store.draft.groupMode = 'one'
  store.draft.groupCount = 1
  activeGroupIndex.value = 0
  const assignments = store.draft.assignments as string[][]
  assignments[0] = [...store.draft.studentIds]
  
  // Keep the existing name or set a default.
  if (isDefaultGroupName(groupNames.value[0])) {
    groupNames.value[0] = t('deployment.assignment.vmDefaultName', { index: 1 })
  }
  groupNames.value.length = 1
}

const setEachUser = () => {
  store.draft.groupMode = 'eachUser'
  store.draft.groupCount = totalStudents.value
  const assignments = store.draft.assignments as string[][]
  for (let i = 0; i < store.draft.groupCount; i++) {
    assignments[i] = []
    groupNames.value[i] = t('deployment.assignment.vmDefaultName', { index: i + 1 })
  }
  store.draft.studentIds.forEach((studentId: string, index: number) => {
    if (assignments[index]) assignments[index].push(studentId)
  })
  activeGroupIndex.value = 0
}

const setCustom = () => {
  store.draft.groupMode = 'custom'
  if (store.draft.groupCount === 1 && totalStudents.value > 1) store.draft.groupCount = 2
  // Ensure names exist for the current count.
  ensureDefaultGroupNames()
}

const increment = () => { if (store.draft.groupCount < totalStudents.value) store.draft.groupCount++ }

const decrement = () => {
  if (store.draft.groupCount > 1) {
    const oldCount = store.draft.groupCount
    const newCount = oldCount - 1
    const assignments = store.draft.assignments as string[][]
    assignments.length = newCount
    store.draft.groupCount = newCount
  }
}

// --- Drag & Drop Logic ---
const handleDragStart = (studentId: string, event: DragEvent) => {
  draggedStudent.value = studentId
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', studentId)
  }
}

const handleDragEnd = () => {
  draggedStudent.value = null
  dragOverGroup.value = null
  dragOverUnassigned.value = false
}

const handleDragOver = (event: DragEvent) => {
  event.preventDefault()
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move'
  }
}

const handleDragEnterGroup = (groupIndex: number) => {
  dragOverGroup.value = groupIndex
}

// ``dragenter`` and ``dragleave`` bubble, so every child of a drop zone fires
// them as the pointer crosses it. Clearing the highlight on each one is not
// just a flicker: the highlight changes the zone's own geometry, so dropping
// it moves the box out from under a stationary cursor, which fires the pair
// again. The two states then chase each other for as long as the pointer
// hovers, the page re-renders every frame, and the browser never gets to the
// ``drop`` -- the drag hangs with the cursor stuck and nothing clickable.
//
// ``relatedTarget`` is the node the pointer moved *to*. When that node still
// sits inside the zone, the pointer never left it.
function hasLeftZone(event: DragEvent) {
  const zone = event.currentTarget as Node | null
  const entered = event.relatedTarget as Node | null
  return !zone || !entered || !zone.contains(entered)
}

const handleDragLeaveGroup = (event: DragEvent) => {
  if (hasLeftZone(event)) dragOverGroup.value = null
}

const handleDragEnterUnassigned = () => {
  dragOverUnassigned.value = true
}

const handleDragLeaveUnassigned = (event: DragEvent) => {
  if (hasLeftZone(event)) dragOverUnassigned.value = false
}

const handleDropOnGroup = (groupIndex: number, event: DragEvent) => {
  event.preventDefault()
  const studentId = draggedStudent.value
  if (!studentId) return

  const assignments = store.draft.assignments as string[][]
  assignments.forEach((group: string[]) => {
    if (group) {
      let idx = group.indexOf(studentId)
      while (idx > -1) {
        group.splice(idx, 1)
        idx = group.indexOf(studentId)
      }
    }
  })

  if (!assignments[groupIndex]) {
    assignments[groupIndex] = []
  }
  if (!assignments[groupIndex].includes(studentId)) {
    assignments[groupIndex].push(studentId)
  }

  dragOverGroup.value = null
}

const handleDropOnUnassigned = (event: DragEvent) => {
  event.preventDefault()
  const studentId = draggedStudent.value
  if (!studentId) return

  const assignments = store.draft.assignments as string[][]
  assignments.forEach((group: string[]) => {
    if (group) {
      let idx = group.indexOf(studentId)
      while (idx > -1) {
        group.splice(idx, 1)
        idx = group.indexOf(studentId)
      }
    }
  })

  dragOverUnassigned.value = false
}

const removeFromGroup = (studentId: string, groupIndex: number) => {
  const assignments = store.draft.assignments as string[][]
  const group = assignments[groupIndex]
  if (group) {
    const idx = group.indexOf(studentId)
    if (idx > -1) group.splice(idx, 1)
  }
}

const shuffleStudents = () => {
  const allStudents = [...store.draft.studentIds]
  
  // Fisher-Yates shuffle with explicit null check.
  for (let i = allStudents.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const temp = allStudents[i]
    allStudents[i] = allStudents[j] ?? ''
    allStudents[j] = temp ?? ''
  }
  
  const assignments = store.draft.assignments as string[][]
  distributeEvenly(allStudents, store.draft.groupCount).forEach((group, i) => {
    assignments[i] = group
  })
}

const clearAllAssignments = () => {
  const assignments = store.draft.assignments as string[][]
  for (let i = 0; i < store.draft.groupCount; i++) {
    assignments[i] = []
  }
}

const handleNext = () => router.push({ name: ROUTE_NAMES.deploymentVariables })
const handleBack = () => router.push({ name: ROUTE_NAMES.deploymentConfig })
</script>

<template>
  <div class="max-w-[1800px] mx-auto w-full px-4">
    
    <div class="surface-panel min-h-[700px] flex flex-col overflow-hidden">
      
      <!-- Header -->
      <div class="p-8 pb-6 bg-panel border-b-2 border-subtle">
        <div class="flex items-center gap-3 mb-4">
          <div class="glass-control w-12 h-12 flex items-center justify-center">
            <Users :size="24" :stroke-width="1.75" class="text-icon" />
          </div>
          <h1 class="text-[32px] leading-tight font-semibold tracking-[-0.015em] text-fg">
            {{ t('deployment.title') }}
          </h1>
        </div>
        <DeploymentProgressBar :current-step="2" />
      </div>

      <!-- Controls Section -->
      <div class="p-6 bg-panel border-b-2 border-subtle">
        <div class="flex flex-wrap items-center justify-between gap-4">
          
          <!-- Mode Selection -->
          <div class="flex gap-2">
            <button @click="setOneGroup" 
              class="px-5 py-2.5 rounded-xl font-semibold transition-all text-sm border-2"
              :class="mode === 'one' 
                ? 'bg-accent text-on-accent border-accent shadow-lg' 
                : 'bg-panel text-fg-muted border-subtle hover:border-strong hover:bg-line/[.07]'">
              {{ t('deployment.groups.one') }}
            </button>
            <button @click="setEachUser" 
              class="px-5 py-2.5 rounded-xl font-semibold transition-all text-sm border-2"
              :class="mode === 'eachUser' 
                ? 'bg-accent text-on-accent border-accent shadow-lg' 
                : 'bg-panel text-fg-muted border-subtle hover:border-strong hover:bg-line/[.07]'">
              {{ t('deployment.groups.eachUser') }}
            </button>
            <button @click="setCustom" 
              class="px-5 py-2.5 rounded-xl font-semibold transition-all text-sm border-2"
              :class="mode === 'custom' 
                ? 'bg-accent text-on-accent border-accent shadow-lg' 
                : 'bg-panel text-fg-muted border-subtle hover:border-strong hover:bg-line/[.07]'">
              {{ t('deployment.groups.custom') }}
            </button>
          </div>

          <!-- Team Counter -->
          <div v-if="showControls" class="flex items-center gap-3 bg-line/[.07] px-4 py-2 rounded-xl border-2 border-subtle">
            <button @click="decrement" 
              class="w-9 h-9 rounded-lg bg-panel border border-strong hover:border-danger-dot hover:bg-danger-dot/10 flex items-center justify-center transition-all text-danger disabled:opacity-40 disabled:cursor-not-allowed" 
              :disabled="groupCount <= 1">
              <Minus :size="18" />
            </button>
            <div class="flex items-center gap-2">
              <span class="text-3xl font-bold text-fg w-12 text-center tabular-nums">{{ groupCount }}</span>
              <span class="text-sm font-semibold text-fg-muted">{{ t('deployment.assignment.teamsLabel') }}</span>
            </div>
            <button @click="increment" 
              class="w-9 h-9 rounded-lg bg-panel border border-strong hover:border-strong hover:bg-line/[.07] flex items-center justify-center transition-all text-fg-muted disabled:opacity-40 disabled:cursor-not-allowed" 
              :disabled="groupCount >= totalStudents">
              <Plus :size="18" />
            </button>
          </div>

          <!-- Action Buttons -->
          <div class="flex gap-2">
            <button @click="shuffleStudents" 
              class="px-4 py-2.5 rounded-xl bg-line/[.07] text-fg font-semibold hover:bg-line/[.12] transition-all flex items-center gap-2 border-2 border-subtle"
              :title="t('deployment.assignment.shuffleTooltip')">
              <Shuffle :size="18" />
              {{ t('deployment.assignment.shuffle') }}
            </button>
            <button @click="clearAllAssignments" 
              class="px-4 py-2.5 rounded-xl bg-danger-dot/10 text-danger font-semibold hover:bg-danger-dot/20 transition-all flex items-center gap-2 border-2 border-danger-dot/30"
              :title="t('deployment.assignment.resetTooltip')">
              <Trash2 :size="18" />
              {{ t('deployment.assignment.reset') }}
            </button>
          </div>
        </div>

        <!-- Info Banner -->
        <div class="mt-4 bg-line/[.04] border-2 border-subtle rounded-xl p-4 flex items-start gap-3">
          <div class="avatar w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
            <GripVertical :size="16" class="text-icon" />
          </div>
          <div>
            <p class="font-semibold text-fg mb-1">{{ t('deployment.assignment.dragDropTitle') }}</p>
            <p class="text-sm text-fg">{{ t('deployment.assignment.dragDropText') }}</p>
          </div>
        </div>
      </div>

      <!-- Main Content Grid -->
      <div class="flex-grow p-6 overflow-hidden">
        <div class="grid grid-cols-1 lg:grid-cols-4 gap-6 h-full">
          
          <!-- Unassigned Students Pool -->
          <div class="lg:col-span-1">
            <div class="h-full flex flex-col bg-panel rounded-xl border-2 border-strong overflow-hidden shadow-lg">
              <div class="bg-panel px-4 py-3 border-b-2 border-subtle flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <UserPlus :size="20" class="text-icon" />
                  <h3 class="font-bold text-fg">{{ t('deployment.assignment.unassigned') }}</h3>
                </div>
                <span class="px-2.5 py-1 bg-line/[.07] rounded-full text-xs font-bold text-fg border-2 border-subtle">
                  {{ unassignedStudents.length }}
                </span>
              </div>
              
              <div 
                data-testid="unassigned-dropzone"
                class="flex-grow p-3 overflow-y-auto bg-line/[.04]"
                :class="dragOverUnassigned ? 'bg-line/[.12] ring-4 ring-accent/30' : ''"
                @dragover="handleDragOver"
                @dragenter="handleDragEnterUnassigned"
                @dragleave="handleDragLeaveUnassigned"
                @drop="handleDropOnUnassigned">
                
                <div v-if="unassignedStudents.length === 0" 
                  class="h-full flex items-center justify-center text-fg-muted text-sm italic text-center px-4 border-2 border-dashed border-strong rounded-lg bg-panel">
                  {{ t('deployment.assignment.allAssigned') }}
                </div>
                
                <div v-else class="space-y-2">
                  <div v-for="studentId in unassignedStudents" 
                    :key="studentId"
                    draggable="true"
                    @dragstart="(e) => handleDragStart(studentId, e)"
                    @dragend="handleDragEnd"
                    class="group bg-panel rounded-lg px-4 py-3 border-2 border-subtle cursor-move hover:border-strong hover:shadow-lg hover:scale-[1.02] transition-all flex items-center gap-3">
                    <GripVertical :size="18" class="text-icon group-hover:text-fg transition-colors" />
                    <span class="font-semibold text-fg group-hover:text-fg flex-1 transition-colors">
                      {{ userDisplayName(studentCache[studentId], studentId) }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Teams Grid -->
          <div class="lg:col-span-3">
            <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 h-full overflow-y-auto pr-2">
              <div v-for="(assignments, index) in (store.draft.assignments as string[][]).slice(0, groupCount)" 
                :key="index"
                class="flex flex-col bg-panel rounded-xl border-2 shadow-lg overflow-hidden transition-all"
                :class="dragOverGroup === index 
                  ? 'border-accent ring-4 ring-accent/30 shadow-2xl'
                  : 'border-subtle hover:border-strong hover:shadow-xl'">
                
                <!-- Team Header -->
                <div class="bg-panel px-4 py-3 border-b-2 border-subtle">
                  <input 
                    type="text"
                    v-model="groupNames[index]"
                    :placeholder="t('deployment.assignment.vmDefaultName', { index: index + 1 })"
                    class="field w-full text-fg placeholder-fg-muted px-3 py-2 focus:border-accent/60 font-bold text-center transition-all"
                  />
                  <div class="mt-2 flex items-center justify-center gap-2 bg-line/[.07] rounded-lg px-3 py-1.5">
                    <Users :size="16" class="text-icon" />
                    <span class="text-sm font-semibold text-fg">
                      {{ t('DeploymentDetailView.deploymentStudentCount', assignments?.length || 0) }}
                    </span>
                  </div>
                </div>

                <!-- Drop Zone -->
                <div 
                  :data-testid="`group-dropzone-${index}`"
                  class="flex-grow p-3 min-h-[200px] overflow-y-auto"
                  :class="dragOverGroup === index ? 'bg-line/[.07]' : 'bg-line/[.04]'"
                  @dragover="handleDragOver"
                  @dragenter="() => handleDragEnterGroup(index)"
                  @dragleave="handleDragLeaveGroup"
                  @drop="(e) => handleDropOnGroup(index, e)">
                  
                  <div v-if="!assignments || assignments.length === 0" 
                    class="h-full flex flex-col items-center justify-center text-fg-muted text-sm italic border-2 border-dashed border-strong rounded-lg p-4 bg-panel">
                    <UserPlus :size="32" class="mb-2 opacity-50" />
                    <p>{{ t('deployment.assignment.dropZone') }}</p>
                  </div>
                  
                  <div v-else class="space-y-2">
                    <div v-for="studentId in assignments" 
                      :key="studentId"
                      draggable="true"
                      @dragstart="(e) => handleDragStart(studentId, e)"
                      @dragend="handleDragEnd"
                      class="group bg-panel rounded-lg px-3 py-2.5 border-2 border-subtle cursor-move hover:border-strong hover:shadow-lg hover:scale-[1.02] transition-all flex items-center gap-2">
                      <GripVertical :size="16" class="text-icon group-hover:text-fg transition-colors flex-shrink-0" />
                      <span class="font-semibold text-fg group-hover:text-fg flex-1 text-sm transition-colors">
                        {{ userDisplayName(studentCache[studentId], studentId) }}
                      </span>
                      <button 
                        @click="removeFromGroup(studentId, index)"
                        class="opacity-0 group-hover:opacity-100 transition-all p-1.5 hover:bg-danger-dot/10 rounded-lg"
                        :title="t('CourseDetailView.removeModal.remove')">
                        <X :size="14" class="text-danger" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      <!-- Footer -->
      <div class="flex justify-between items-center p-6 pt-4 bg-panel border-t-2 border-subtle">
        <button 
          @click="handleBack"
          class="btn-secondary flex items-center gap-2 px-8 py-3 rounded-control font-semibold transition">
          <ArrowLeft :size="20" />
          {{ t('deployment.actions.back') }}
        </button>
        
        <div class="text-center">
          <p class="text-sm text-fg-muted mb-1">{{ t('deployment.assignment.progress') }}</p>
          <p class="text-lg font-bold text-fg-muted">
            {{ t('deployment.assignment.assignedCount', { assigned: totalStudents - unassignedStudents.length, total: totalStudents }) }}
          </p>
        </div>
        
        <button 
          @click="handleNext"
          :disabled="unassignedStudents.length > 0 || (store.draft.assignments as string[][]).slice(0, groupCount).some((g: string[]) => !g || g.length === 0) || groupNames.slice(0, groupCount).some((name: string) => !name || name.trim() === '')"
          class="btn-primary flex items-center gap-2 px-8 py-3 rounded-control font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed">
          {{ t('deployment.actions.next') }}
          <ArrowRight :size="20" />
        </button>
      </div>

    </div>
  </div>
</template>