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
    class="flex flex-col bg-panel rounded-xl border-2 shadow-lg overflow-hidden transition-all"
    :class="highlighted
      ? 'border-accent ring-4 ring-accent/30 shadow-2xl'
      : 'border-subtle hover:border-strong hover:shadow-xl'">

    <div class="bg-panel px-4 py-3 border-b-2 border-subtle">
      <input
        type="text"
        v-model="name"
        :placeholder="t('deployment.assignment.vmDefaultName', { index: index + 1 })"
        class="field w-full text-fg placeholder-fg-muted px-3 py-2 focus:border-accent/60 font-bold text-center transition-all"
      />
      <div class="mt-2 flex items-center justify-center gap-2 bg-line/[.07] rounded-lg px-3 py-1.5">
        <Users :size="16" class="text-icon" />
        <span class="text-sm font-semibold text-fg">
          {{ t('DeploymentDetailView.deploymentStudentCount', members?.length || 0) }}
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
        class="h-full flex flex-col items-center justify-center text-fg-muted text-sm italic border-2 border-dashed border-strong rounded-lg p-4 bg-panel">
        <UserPlus :size="32" class="mb-2 opacity-50" />
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
