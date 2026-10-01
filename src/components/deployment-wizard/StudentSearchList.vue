<script setup lang="ts">
/** The config step's person search with a checkbox per result. */
import { useI18n } from 'vue-i18n'
import { Check, Search } from 'lucide-vue-next'
import { userDisplayName } from '@/utils/user-display'

defineProps<{
  students: any[]
  selectedIds: string[]
}>()

const query = defineModel<string>('query', { required: true })

defineEmits<{ toggle: [userId: string] }>()

const { t } = useI18n()
</script>

<template>
  <div>
    <h3 class="text-lg font-semibold text-fg mb-4">{{ t('deployment.config.studentsLabel') }}</h3>

    <div class="relative mb-4">
      <Search class="absolute left-4 top-1/2 transform -translate-y-1/2 text-icon" :size="20" />
      <input
        v-model="query"
        type="text"
        :placeholder="t('deployment.config.searchPlaceholder')"
        data-testid="student-search"
        class="field w-full pl-12 pr-4 py-3 transition-all"
      />
    </div>

    <div class="surface-panel max-h-[350px] overflow-y-auto">
      <div
        v-for="student in students"
        :key="student.userId"
        @click="$emit('toggle', student.userId)"
        :data-testid="`student-${student.userId}`"
        class="flex items-center gap-3 px-4 py-3 cursor-pointer border-b last:border-b-0 border-subtle transition-colors select-none"
        :class="selectedIds.includes(student.userId) ? 'bg-line/[.07]' : 'hover:bg-line/[.07]'"
      >
        <div class="w-6 h-6 flex items-center justify-center rounded border transition-colors"
             :class="selectedIds.includes(student.userId) ? 'bg-accent border-accent' : 'border-strong bg-panel'"
        >
           <Check v-if="selectedIds.includes(student.userId)" :size="16" class="text-on-accent" />
        </div>
        <span class="text-fg font-medium">
          {{ userDisplayName(student, student.userId) }}
        </span>
      </div>

      <div v-if="students.length === 0" class="p-4 text-fg-muted text-center">
        {{ t('common.noUsersFound') }}
      </div>
    </div>
  </div>
</template>
