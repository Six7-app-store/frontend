<script setup lang="ts">
/** The config step's course list; a click selects or deselects all students of a course. */
import { useI18n } from 'vue-i18n'
import { Check } from 'lucide-vue-next'

defineProps<{
  courses: any[]
  /** Course IDs whose member count is still loading. */
  loading: Set<string>
  isSelected: (courseId: string) => boolean
  countOf: (courseId: string) => number
}>()

defineEmits<{ toggle: [courseId: string] }>()

const { t } = useI18n()
</script>

<template>
  <div>
    <h3 class="text-lg font-semibold text-fg mb-4">{{ t('common.courses') }}</h3>
    <div class="space-y-3 max-h-[400px] overflow-y-auto">
      <div
        v-for="course in courses"
        :key="course.courseId"
        @click="$emit('toggle', course.courseId)"
        :data-testid="`course-${course.courseId}`"
        class="flex items-center gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all"
        :class="isSelected(course.courseId)
          ? 'bg-line/[.07] border-strong'
          : 'bg-line/[.04] border-subtle hover:border-strong'"
      >
        <div class="w-6 h-6 flex items-center justify-center rounded border transition-colors"
             :class="isSelected(course.courseId) ? 'bg-accent border-accent' : 'border-strong bg-panel'"
        >
           <Check v-if="isSelected(course.courseId)" :size="16" class="text-on-accent" />
        </div>
        <div class="flex-grow">
          <div class="font-semibold text-fg">{{ course.name }}</div>
          <div class="text-sm text-fg-muted">
            <span v-if="loading.has(course.courseId)">{{ t('common.loadingCourses') }}</span>
            <span v-else>{{ t('common.studentCount', countOf(course.courseId)) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
