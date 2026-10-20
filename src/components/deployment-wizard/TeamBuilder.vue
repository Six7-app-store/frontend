<script setup lang="ts">
/**
 * "Gruppen selbst bilden": the number of groups, random split and reset,
 * the pool of people without a group and one drop card per group. People
 * move by drag & drop; a member card's remove button puts them back.
 */
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Minus, Plus, Shuffle, Trash2 } from 'lucide-vue-next'
import BaseButton from '@/components/ui/BaseButton.vue'
import ConfirmModal from '@/components/ui/ConfirmModal.vue'
import StudentChip from '@/components/deployment-wizard/StudentChip.vue'
import TeamDropCard from '@/components/deployment-wizard/TeamDropCard.vue'
import type { TeamAssignment } from '@/composables/useTeamAssignment'

const props = defineProps<{
  assignment: TeamAssignment
  nameOf: (studentId: string) => string
}>()

const { t } = useI18n()
const {
  groupNames, groupCount, totalStudents, unassigned, teams,
  increment, decrement, moveTo, shuffle, clearAll,
} = props.assignment

const showResetConfirm = ref(false)
function confirmReset() {
  clearAll()
  showResetConfirm.value = false
}

const dragged = ref<string | null>(null)
const overGroup = ref<number | null>(null)
const overPool = ref(false)

function onDragStart(studentId: string, event: DragEvent) {
  dragged.value = studentId
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', studentId)
  }
}

function onDragEnd() {
  dragged.value = null
  overGroup.value = null
  overPool.value = false
}

function onDragOver(event: DragEvent) {
  event.preventDefault()
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'
}

// ``dragenter``/``dragleave`` bubble from every child of a zone. Clearing the
// highlight on each one changes the zone's geometry under a still cursor,
// which fires the pair again, and the drag hangs. ``relatedTarget`` is where
// the pointer went: still inside the zone means it never left.
function hasLeftZone(event: DragEvent) {
  const zone = event.currentTarget as Node | null
  const entered = event.relatedTarget as Node | null
  return !zone || !entered || !zone.contains(entered)
}

/** Drops the dragged person into group ``target``, or into the pool for ``null``. */
function onDrop(target: number | null, event: DragEvent) {
  event.preventDefault()
  if (dragged.value) moveTo(dragged.value, target)
  overGroup.value = null
  overPool.value = false
}
</script>

<template>
  <div class="flex flex-col gap-4" data-testid="team-builder">
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div class="flex items-center gap-3">
        <BaseButton variant="secondary" icon :label="t('deployment.wizard.teams.remove')" :disabled="groupCount <= 1" @click="decrement">
          <Minus :size="16" aria-hidden="true" />
        </BaseButton>
        <span class="flex items-baseline gap-2" aria-live="polite">
          <span class="w-8 text-center text-3xl font-semibold tabular-nums text-heading" data-testid="team-count">{{ groupCount }}</span>
          <span class="text-sm text-fg-muted">{{ t('deployment.wizard.teams.count') }}</span>
        </span>
        <BaseButton variant="secondary" icon :label="t('deployment.wizard.teams.add')" :disabled="groupCount >= totalStudents" @click="increment">
          <Plus :size="16" aria-hidden="true" />
        </BaseButton>
      </div>
      <div class="flex gap-2">
        <BaseButton variant="secondary" data-testid="btn-shuffle" @click="shuffle()">
          <Shuffle :size="16" aria-hidden="true" />
          {{ t('deployment.wizard.teams.shuffle') }}
        </BaseButton>
        <BaseButton variant="danger" data-testid="btn-reset" @click="showResetConfirm = true">
          <Trash2 :size="16" aria-hidden="true" />
          {{ t('deployment.wizard.teams.reset') }}
        </BaseButton>
      </div>
    </div>

    <p class="text-sm text-fg-muted">{{ t('deployment.wizard.teams.dragHint') }}</p>

    <div class="grid grid-cols-1 gap-4 lg:grid-cols-4">
      <div class="surface-panel flex flex-col overflow-hidden lg:col-span-1">
        <h3 class="flex items-baseline gap-2 border-b border-faint px-4 py-3 font-semibold text-heading">
          {{ t('deployment.wizard.teams.pool') }}
          <span class="text-sm font-normal tabular-nums text-fg-muted" data-testid="pool-count">{{ unassigned.length }}</span>
        </h3>
        <div
          data-testid="unassigned-dropzone"
          class="flex-grow overflow-y-auto p-3"
          :class="overPool ? 'bg-line/[.12]' : 'bg-line/[.04]'"
          @dragover="onDragOver"
          @dragenter="overPool = true"
          @dragleave="(e) => { if (hasLeftZone(e)) overPool = false }"
          @drop="(e) => onDrop(null, e)"
        >
          <p v-if="unassigned.length === 0" class="drop-zone flex h-full items-center justify-center px-4 py-6 text-center text-sm text-fg-muted">
            {{ t('deployment.wizard.teams.allAssigned') }}
          </p>
          <div v-else class="space-y-2">
            <StudentChip
              v-for="studentId in unassigned"
              :key="studentId"
              :name="nameOf(studentId)"
              @dragstart="(e: DragEvent) => onDragStart(studentId, e)"
              @dragend="onDragEnd"
            />
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:col-span-3 xl:grid-cols-3">
        <TeamDropCard
          v-for="(members, index) in teams"
          :key="index"
          v-model:name="groupNames[index]"
          :index="index"
          :members="members"
          :highlighted="overGroup === index"
          :name-of="nameOf"
          @dragover="onDragOver"
          @dragenter="overGroup = index"
          @dragleave="(e) => { if (hasLeftZone(e)) overGroup = null }"
          @drop="(e) => onDrop(index, e)"
          @member-dragstart="onDragStart"
          @member-dragend="onDragEnd"
          @remove="(studentId) => moveTo(studentId, null)"
        />
      </div>
    </div>
  </div>

  <ConfirmModal
    :show="showResetConfirm"
    :title="t('deployment.wizard.teams.resetConfirmTitle')"
    :confirm-label="t('deployment.wizard.teams.reset')"
    @close="showResetConfirm = false"
    @confirm="confirmReset"
  >
    <p class="text-fg">{{ t('deployment.wizard.teams.resetConfirmText') }}</p>
  </ConfirmModal>
</template>
