<script setup lang="ts">
/**
 * One team of the team-assignment step: its editable name, member count and
 * the drop zone with the member cards. The drag state lives in the view; the
 * card only reports the native drag events of its zone and cards.
 */
import { useI18n } from 'vue-i18n'
import { Users, UserPlus } from 'lucide-vue-next'
import StudentChip from '@/components/deployment-wizard/StudentChip.vue'

defineProps<{
  index: number
  members: string[]
  highlighted: boolean
  nameOf: (studentId: string) => string
}>()

const name = defineModel<string>('name')

defineEmits<{
  dragover: [event: DragEvent]
  dragenter: []
  dragleave: [event: DragEvent]
  drop: [event: DragEvent]
  memberDragstart: [studentId: string, event: DragEvent]
  memberDragend: []
  remove: [studentId: string]
}>()

const { t } = useI18n()
</script>

<template>
  <div
    class="surface-panel flex flex-col overflow-hidden rounded-xl transition-colors"
    :class="{ 'border-icon': highlighted }">

    <div class="border-b border-faint px-4 py-3">
      <input
        type="text"
        v-model="name"
        :placeholder="t('deployment.assignment.vmDefaultName', { index: index + 1 })"
        class="field w-full px-3 py-2 text-center font-semibold"
      />
      <div class="mt-2 flex items-center justify-center gap-2 text-sm text-fg-muted">
        <Users :size="14" class="text-icon" aria-hidden="true" />
        <span>
          {{ t('common.studentCount', members?.length || 0) }}
        </span>
      </div>
    </div>

    <div
      :data-testid="`group-dropzone-${index}`"
      class="flex-grow p-3 min-h-[200px] overflow-y-auto"
      :class="highlighted ? 'bg-line/[.07]' : 'bg-line/[.04]'"
      @dragover="(e) => $emit('dragover', e)"
      @dragenter="$emit('dragenter')"
      @dragleave="(e) => $emit('dragleave', e)"
      @drop="(e) => $emit('drop', e)">

      <div v-if="!members || members.length === 0"
        class="drop-zone flex h-full flex-col items-center justify-center p-4 text-sm text-fg-muted">
        <UserPlus :size="22" class="mb-2 text-icon" aria-hidden="true" />
        <p>{{ t('deployment.assignment.dropZone') }}</p>
      </div>

      <div v-else class="space-y-2">
        <StudentChip
          v-for="studentId in members"
          :key="studentId"
          :name="nameOf(studentId)"
          compact
          removable
          @dragstart="(e: DragEvent) => $emit('memberDragstart', studentId, e)"
          @dragend="$emit('memberDragend')"
          @remove="$emit('remove', studentId)" />
      </div>
    </div>
  </div>
</template>
