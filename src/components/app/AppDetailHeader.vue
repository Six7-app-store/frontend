<script setup lang="ts">
/** Icon or image, name, version count and repository of an app, with edit and delete for those allowed. */
import { GitBranch, Pencil, Trash2 } from 'lucide-vue-next'
import BaseButton from '@/components/ui/BaseButton.vue'
import { iconForAppName } from '@/services/app-presentation.service'

defineProps<{ app: any; canEdit: boolean }>()
defineEmits<{ edit: []; delete: [] }>()
</script>

<template>
  <div class="flex items-start gap-6 mb-6 border-b border-subtle pb-6">
    <div class="bg-line/[.07] border border-subtle p-4 rounded-xl text-icon flex items-center justify-center w-[88px] h-[88px] flex-shrink-0">
      <img v-if="app.image" :src="app.image" :alt="app.name" class="w-full h-full object-contain" />
      <component v-else :is="iconForAppName(app.name)" :size="48" />
    </div>
    <div class="flex-grow">
      <div class="flex justify-between items-start">
        <div>
          <h1 class="text-3xl font-bold text-fg mb-2">{{ app.name }}</h1>
          <div class="flex items-center gap-3 text-sm text-fg-muted">
            <span class="flex items-center gap-1 bg-line/[.07] px-2 py-1 rounded">
              <GitBranch :size="14" /> {{ app.versions?.length || 0 }} {{ $t('AppsDetailView.versionsAvailable') }}
            </span>
            <a v-if="app.git_link" :href="app.git_link" target="_blank" rel="noopener noreferrer" class="text-fg-muted hover:text-accent-fg hover:underline cursor-pointer truncate max-w-xs block">
              {{ app.git_link }}
            </a>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <BaseButton v-if="canEdit" @click="$emit('edit')" class="flex items-center gap-2 px-4 py-2" variant="ghost">
            <Pencil :size="18" />
            <span class="font-medium">{{ $t('AppsDetailView.editApp') }}</span>
          </BaseButton>
          <BaseButton v-if="canEdit" @click="$emit('delete')" class="flex items-center gap-2 px-4 py-2" variant="danger">
            <Trash2 :size="18" />
            <span class="font-medium">{{ $t('AppsDetailView.deleteApp') }}</span>
          </BaseButton>
        </div>
      </div>
    </div>
  </div>
</template>
