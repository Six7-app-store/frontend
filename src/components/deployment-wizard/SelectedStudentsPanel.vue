<script setup lang="ts">
/** The students picked so far in the config step, each removable. */
import { useI18n } from 'vue-i18n'
import { Users, X } from 'lucide-vue-next'
import { userDisplayName } from '@/utils/user-display'

defineProps<{ students: any[] }>()

defineEmits<{ remove: [userId: string] }>()

const { t } = useI18n()
</script>

<template>
  <div>
    <h3 class="mb-3 flex items-center gap-2 text-md font-semibold text-heading">
      <Users :size="16" class="text-icon" aria-hidden="true" />
      {{ t('deployment.groups.studentsSelected', { count: students.length }) }}
    </h3>

    <div class="surface-panel max-h-[400px] overflow-y-auto">
      <div v-if="students.length === 0" class="py-8 text-center text-fg-muted">
        {{ t('deployment.assignment.noStudents') }}
      </div>
      <div v-else class="divide-y divide-faint">
        <div
          v-for="student in students"
          :key="student.userId"
          class="flex items-center justify-between px-4 py-2"
        >
          <span class="text-fg">
            {{ userDisplayName(student, student.userId) }}
          </span>
          <button
            type="button"
            class="btn btn-danger btn-icon h-[26px] w-[26px]"
            :title="t('common.remove')"
            :aria-label="t('common.remove')"
            :data-testid="`remove-${student.userId}`"
            @click="$emit('remove', student.userId)"
          >
            <X :size="14" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
