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
import { Plus, Minus, GripVertical, Trash2, Shuffle } from 'lucide-vue-next'
import AlertBox from '@/components/ui/AlertBox.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import ConfirmModal from '@/components/ui/ConfirmModal.vue'

const { t } = useI18n()
const router = useRouter()
const store = useDeploymentStore()
const directory = useStudentDirectory()
const {
  groupNames, groupCount, totalStudents, mode, unassigned: unassignedStudents, teams, complete,
  prepare, setOneGroup, setEachUser, setCustom, increment, decrement, moveTo, shuffle, clearAll,
} = useTeamAssignment()

const showResetConfirm = ref(false)

const confirmReset = () => {
  clearAll()
  showResetConfirm.value = false
}

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
      <!-- Controls -->
      <div class="flex flex-col gap-4 border-b border-subtle pb-6">
        <div class="flex flex-wrap items-center justify-between gap-4">
          <GroupModeSelector :mode="mode" @select="selectMode" />

          <!-- Team counter -->
          <div v-if="mode === 'custom'" class="flex items-center gap-3">
            <BaseButton
              variant="secondary"
              icon
              :label="t('deployment.assignment.removeTeam')"
              :disabled="groupCount <= 1"
              @click="decrement"
            >
              <Minus :size="16" aria-hidden="true" />
            </BaseButton>
            <span class="flex items-baseline gap-2">
              <span class="w-8 text-center text-3xl font-semibold tabular-nums text-heading">{{ groupCount }}</span>
              <span class="text-sm text-fg-muted">{{ t('deployment.assignment.teamsLabel') }}</span>
            </span>
            <BaseButton
              variant="secondary"
              icon
              :label="t('deployment.assignment.addTeam')"
              :disabled="groupCount >= totalStudents"
              @click="increment"
            >
              <Plus :size="16" aria-hidden="true" />
            </BaseButton>
          </div>

          <div class="flex gap-2">
            <BaseButton variant="secondary" :title="t('deployment.assignment.shuffleTooltip')" @click="shuffle()">
              <Shuffle :size="16" aria-hidden="true" />
              {{ t('deployment.assignment.shuffle') }}
            </BaseButton>
            <!-- Clearing undoes all manual work, so it asks first. -->
            <BaseButton variant="danger" :title="t('deployment.assignment.resetTooltip')" @click="showResetConfirm = true">
              <Trash2 :size="16" aria-hidden="true" />
              {{ t('deployment.assignment.reset') }}
            </BaseButton>
          </div>
        </div>

        <AlertBox tone="info" :icon="GripVertical" :title="t('deployment.assignment.dragDropTitle')">
          {{ t('deployment.assignment.dragDropText') }}
        </AlertBox>
      </div>

      <!-- Main Content Grid -->
      <div class="pt-6">
        <div class="grid grid-cols-1 lg:grid-cols-4 gap-6 h-full">
          
          <!-- Unassigned Students Pool -->
          <div class="lg:col-span-1">
            <div class="surface-panel flex h-full flex-col overflow-hidden">
              <div class="flex items-center justify-between border-b border-faint px-4 py-3">
                <h3 class="flex items-baseline gap-2 font-semibold text-heading">
                  {{ t('deployment.assignment.unassigned') }}
                  <span class="text-sm font-normal tabular-nums text-fg-muted">{{ unassignedStudents.length }}</span>
                </h3>
              </div>
              
              <div 
                data-testid="unassigned-dropzone"
                class="flex-grow p-3 overflow-y-auto bg-line/[.04]"
                :class="dragOverUnassigned ? 'bg-line/[.12]' : ''"
                @dragover="handleDragOver"
                @dragenter="dragOverUnassigned = true"
                @dragleave="handleDragLeaveUnassigned"
                @drop="(e) => handleDrop(null, e)">
                
                <div v-if="unassignedStudents.length === 0" 
                  class="drop-zone flex h-full items-center justify-center px-4 text-center text-sm text-fg-muted">
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
          <p class="mb-0.5 text-xs text-fg-muted">{{ t('deployment.assignment.progress') }}</p>
          <p class="text-base font-semibold tabular-nums text-heading">
            {{ t('deployment.assignment.assignedCount', { assigned: totalStudents - unassignedStudents.length, total: totalStudents }) }}
          </p>
        </div>
      </template>
  </WizardStepLayout>

  <ConfirmModal
    :show="showResetConfirm"
    :title="t('deployment.assignment.resetConfirmTitle')"
    :confirm-label="t('deployment.assignment.reset')"
    @close="showResetConfirm = false"
    @confirm="confirmReset"
  >
    <p class="text-fg">{{ t('deployment.assignment.resetConfirmText') }}</p>
  </ConfirmModal>
</template>