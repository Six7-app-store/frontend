<script setup lang="ts">
import { ROUTE_NAMES } from '@/router/route-names'
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useDeploymentStore } from '@/stores/deployment.store'
import { useStudentDirectory } from '@/composables/useStudentDirectory'
import { useTeamAssignment } from '@/composables/useTeamAssignment'
import WizardStepLayout from '@/components/deployment-wizard/WizardStepLayout.vue'
import { userDisplayName } from '@/utils/user-display'
import GroupModeSelector from '@/components/deployment-wizard/GroupModeSelector.vue'
import StudentChip from '@/components/deployment-wizard/StudentChip.vue'
import TeamDropCard from '@/components/deployment-wizard/TeamDropCard.vue'
import type { GroupMode } from '@/types'
import { Plus, Minus, GripVertical, Trash2, UserPlus, Shuffle } from 'lucide-vue-next'

const { t } = useI18n()
const router = useRouter()
const store = useDeploymentStore()
const directory = useStudentDirectory()
const {
  groupNames, groupCount, totalStudents, mode, unassigned: unassignedStudents, teams, complete,
  prepare, setOneGroup, setEachUser, setCustom, increment, decrement, moveTo, shuffle, clearAll,
} = useTeamAssignment()

const selectMode = (next: GroupMode) =>
  ({ one: setOneGroup, eachUser: setEachUser, custom: setCustom })[next]()

const nameOf = (studentId: string) => userDisplayName(directory.studentOf(studentId), studentId)

onMounted(async () => {
  if (!store.draft.studentIds || store.draft.studentIds.length === 0) {
    router.replace({ name: ROUTE_NAMES.deploymentConfig })
    return
  }
  prepare()
  await directory.ensureLoaded([
    ...store.draft.studentIds,
    ...teams.value.flat(),
  ])
})

// --- Drag & Drop ---
const draggedStudent = ref<string | null>(null)
const dragOverGroup = ref<number | null>(null)
const dragOverUnassigned = ref(false)

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
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'
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

const handleDragLeaveUnassigned = (event: DragEvent) => {
  if (hasLeftZone(event)) dragOverUnassigned.value = false
}

/** Drops the dragged student into team ``target``, or into the pool for ``null``. */
const handleDrop = (target: number | null, event: DragEvent) => {
  event.preventDefault()
  const studentId = draggedStudent.value
  if (!studentId) return
  moveTo(studentId, target)
  dragOverGroup.value = null
  dragOverUnassigned.value = false
}

const handleNext = () => router.push({ name: ROUTE_NAMES.deploymentVariables })
const handleBack = () => router.push({ name: ROUTE_NAMES.deploymentConfig })
</script>

<template>
  <WizardStepLayout :step="2" :next-disabled="!complete" @back="handleBack" @next="handleNext">
      <!-- Controls Section -->
      <div class="pb-6 border-b-2 border-subtle">
        <div class="flex flex-wrap items-center justify-between gap-4">
          
          <GroupModeSelector :mode="mode" @select="selectMode" />

          <!-- Team Counter -->
          <div v-if="mode === 'custom'" class="flex items-center gap-3 bg-line/[.07] px-4 py-2 rounded-xl border-2 border-subtle">
            <button @click="decrement" 
              class="w-9 h-9 rounded-lg bg-panel border border-strong hover:border-danger-dot hover:bg-danger-dot/10 flex items-center justify-center transition-all text-danger disabled:opacity-40 disabled:cursor-not-allowed" 
              :disabled="groupCount <= 1">
              <Minus :size="18" />
            </button>
            <div class="flex items-center gap-2">
              <span class="text-3xl font-semibold text-fg w-12 text-center tabular-nums">{{ groupCount }}</span>
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
            <button @click="shuffle()" 
              class="px-4 py-2.5 rounded-xl bg-line/[.07] text-fg font-semibold hover:bg-line/[.12] transition-all flex items-center gap-2 border-2 border-subtle"
              :title="t('deployment.assignment.shuffleTooltip')">
              <Shuffle :size="18" />
              {{ t('deployment.assignment.shuffle') }}
            </button>
            <button @click="clearAll" 
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
      <div class="pt-6">
        <div class="grid grid-cols-1 lg:grid-cols-4 gap-6 h-full">
          
          <!-- Unassigned Students Pool -->
          <div class="lg:col-span-1">
            <div class="h-full flex flex-col bg-panel rounded-xl border-2 border-strong overflow-hidden shadow-lg">
              <div class="bg-panel px-4 py-3 border-b-2 border-subtle flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <UserPlus :size="20" class="text-icon" />
                  <h3 class="font-semibold text-fg">{{ t('deployment.assignment.unassigned') }}</h3>
                </div>
                <span class="px-2.5 py-1 bg-line/[.07] rounded-full text-xs font-semibold text-fg border-2 border-subtle">
                  {{ unassignedStudents.length }}
                </span>
              </div>
              
              <div 
                data-testid="unassigned-dropzone"
                class="flex-grow p-3 overflow-y-auto bg-line/[.04]"
                :class="dragOverUnassigned ? 'bg-line/[.12] ring-4 ring-accent/30' : ''"
                @dragover="handleDragOver"
                @dragenter="dragOverUnassigned = true"
                @dragleave="handleDragLeaveUnassigned"
                @drop="(e) => handleDrop(null, e)">
                
                <div v-if="unassignedStudents.length === 0" 
                  class="h-full flex items-center justify-center text-fg-muted text-sm italic text-center px-4 border-2 border-dashed border-strong rounded-lg bg-panel">
                  {{ t('deployment.assignment.allAssigned') }}
                </div>
                
                <div v-else class="space-y-2">
                  <StudentChip
                    v-for="studentId in unassignedStudents"
                    :key="studentId"
                    :name="nameOf(studentId)"
                    @dragstart="(e: DragEvent) => handleDragStart(studentId, e)"
                    @dragend="handleDragEnd" />
                </div>
              </div>
            </div>
          </div>

          <!-- Teams Grid -->
          <div class="lg:col-span-3">
            <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 h-full overflow-y-auto pr-2">
              <TeamDropCard
                v-for="(members, index) in teams"
                :key="index"
                v-model:name="groupNames[index]"
                :index="index"
                :members="members"
                :highlighted="dragOverGroup === index"
                :name-of="nameOf"
                @dragover="handleDragOver"
                @dragenter="dragOverGroup = index"
                @dragleave="handleDragLeaveGroup"
                @drop="(e) => handleDrop(index, e)"
                @member-dragstart="handleDragStart"
                @member-dragend="handleDragEnd"
                @remove="(studentId) => moveTo(studentId, null)" />
            </div>
          </div>

        </div>
      </div>

      <template #status>
        <div class="text-center">
          <p class="text-sm text-fg-muted mb-1">{{ t('deployment.assignment.progress') }}</p>
          <p class="text-lg font-semibold text-fg-muted">
            {{ t('deployment.assignment.assignedCount', { assigned: totalStudents - unassignedStudents.length, total: totalStudents }) }}
          </p>
        </div>
      </template>
  </WizardStepLayout>
</template>