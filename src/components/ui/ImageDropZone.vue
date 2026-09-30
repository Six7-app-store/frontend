<script setup lang="ts">
/**
 * Drop area for one image: click or drop to choose, a thumbnail with a
 * remove button once there is one. Validation and state live with the
 * caller (see ``useImageUpload``); this only reports the chosen file.
 */
import { ref } from 'vue'
import { Image as ImageIcon } from 'lucide-vue-next'

defineProps<{
  previewUrl: string | null
  /** Shown next to the thumbnail, e.g. the file name. */
  caption: string
  placeholder: string
  removeLabel: string
}>()

const emit = defineEmits<{
  (e: 'select', file: File): void
  (e: 'remove'): void
}>()

const input = ref<HTMLInputElement | null>(null)
const dragging = ref(false)

const selectFirst = (files: FileList | null | undefined) => {
  const first = files?.[0]
  if (first) emit('select', first)
}

const onChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  selectFirst(target.files)
  // Clear it so choosing the same file again still fires ``change``.
  target.value = ''
}

const onDrop = (event: DragEvent) => {
  dragging.value = false
  selectFirst(event.dataTransfer?.files)
}
</script>

<template>
  <div
    class="drop-zone flex min-h-[60px] cursor-pointer items-center px-3 py-2 text-fg"
    :class="{ 'drop-zone-active': dragging }"
    @dragover.prevent="dragging = true"
    @dragleave.prevent="dragging = false"
    @drop.prevent="onDrop"
    @click="input?.click()"
  >
    <input ref="input" type="file" accept="image/*" class="hidden" @change="onChange" />
    <div v-if="previewUrl" class="flex justify-between items-center w-full gap-3">
      <div class="flex items-center gap-3 min-w-0">
        <img :src="previewUrl" alt="" class="w-10 h-10 object-contain rounded bg-line/[.04]" />
        <span class="text-sm text-fg truncate">{{ caption }}</span>
      </div>
      <button type="button" class="text-xs text-fg-muted hover:text-danger shrink-0" @click.stop="emit('remove')">
        {{ removeLabel }}
      </button>
    </div>
    <div v-else class="flex items-center gap-2 text-sm text-fg-muted">
      <ImageIcon :size="18" />
      <span>{{ placeholder }}</span>
    </div>
  </div>
</template>
