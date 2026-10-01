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
    <h3 class="mb-3 text-md font-semibold text-heading">{{ t('common.courses') }}</h3>
    <div class="surface-panel max-h-[400px] divide-y divide-faint overflow-y-auto">
      <div
        v-for="course in courses"
        :key="course.courseId"
        @click="$emit('toggle', course.courseId)"
        :data-testid="`course-${course.courseId}`"
        role="checkbox"
        :aria-checked="isSelected(course.courseId)"
        tabindex="0"
        class="hover-tint flex cursor-pointer items-center gap-3 px-4 py-3"
        @keydown.space.prevent="$emit('toggle', course.courseId)"
      >
        <div class="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-tag border transition-colors"
             :class="isSelected(course.courseId) ? 'border-accent-strong bg-accent' : 'field'"
             aria-hidden="true"
        >
           <Check v-if="isSelected(course.courseId)" :size="13" :stroke-width="3" class="text-on-accent" />
        </div>
        <div class="flex-grow">
          <div class="font-semibold text-heading">{{ course.name }}</div>
          <div class="text-sm text-fg-muted">
            <span v-if="loading.has(course.courseId)">{{ t('common.loadingCourses') }}</span>
            <span v-else>{{ t('common.studentCount', countOf(course.courseId)) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
