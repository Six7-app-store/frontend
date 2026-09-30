<script setup lang="ts">
/** The students picked so far in the config step, each removable. */
import { useI18n } from 'vue-i18n'
import { Users } from 'lucide-vue-next'
import { userDisplayName } from '@/utils/user-display'

defineProps<{ students: any[] }>()

defineEmits<{ remove: [userId: string] }>()

const { t } = useI18n()
</script>

<template>
  <div>
    <h3 class="text-lg font-semibold text-fg mb-4 flex items-center gap-2">
      <Users :size="20" />
      {{ t('deployment.groups.studentsSelected', { count: students.length }) }}
    </h3>

    <div class="bg-line/[.04] rounded-lg border-2 border-subtle p-4 max-h-[400px] overflow-y-auto">
      <div v-if="students.length === 0" class="text-fg-muted text-center py-8">
        {{ t('deployment.assignment.noStudents') }}
      </div>
      <div v-else class="space-y-2">
        <div
          v-for="student in students"
          :key="student.userId"
          class="flex items-center justify-between bg-panel p-3 rounded-lg border border-subtle"
        >
          <span class="text-fg font-medium">
            {{ userDisplayName(student, student.userId) }}
          </span>
          <button
            @click="$emit('remove', student.userId)"
            class="text-danger hover:text-danger font-semibold text-lg leading-none"
            :title="t('common.remove')"
            :data-testid="`remove-${student.userId}`"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
