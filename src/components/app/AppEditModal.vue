<script setup lang="ts">
/**
 * Editing an app's name, description and image. The repository link is
 * immutable (the backend rejects it), and visibility has its own switch in
 * the store tab. Emits only the fields that changed, so stale values never
 * overwrite what the server holds; nothing changed closes the dialog.
 */
import { ref, watch } from 'vue'
import Modal from '@/components/ui/Modal.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import ImageDropZone from '@/components/ui/ImageDropZone.vue'
import MarkdownEditor from '@/components/MarkdownEditor.vue'
import { useImageUpload } from '@/composables/useImageUpload'
import { readFileAsDataUrl } from '@/utils/file'
import type { AppUpdate } from '@/types'

const props = defineProps<{ show: boolean; app: any; saving: boolean }>()

const emit = defineEmits<{
  close: []
  save: [changes: AppUpdate]
  /** The name was left empty. */
  invalid: []
}>()

const editForm = ref<{ name: string; description: string }>({ name: '', description: '' })
// Image on save: a new file is sent as a data URL, a removed image as ''
// (the backend clears it), an untouched one is left out.
const {
  file: editImageFile,
  previewUrl: editImagePreview,
  removed: editImageRemoved,
  reset: resetEditImage,
  choose: chooseEditImage,
  remove: removeEditImage,
} = useImageUpload()

watch(() => props.show, (open) => {
  if (!open) return
  editForm.value = { name: props.app.name || '', description: props.app.description || '' }
  resetEditImage(props.app.image || null)
}, { immediate: true })

const closeEditModal = () => {
  if (!props.saving) emit('close')
}

const submitEdit = async () => {
  const name = editForm.value.name.trim()
  if (!name) {
    emit('invalid')
    return
  }
  const changes: AppUpdate = {}
  if (name !== props.app.name) changes.name = name
  if (editForm.value.description !== (props.app.description || '')) changes.description = editForm.value.description
  if (editImageFile.value) {
    changes.image = (await readFileAsDataUrl(editImageFile.value)) ?? ''
  } else if (editImageRemoved.value) {
    changes.image = ''
  }
  if (Object.keys(changes).length === 0) emit('close')
  else emit('save', changes)
}
</script>

<template>
  <Modal :show="show" @close="closeEditModal">
    <template #title>{{ $t('AppsDetailView.editModal.title') }}</template>
    <template #body>
      <div class="space-y-4">
        <p class="text-sm text-fg-muted">{{ $t('AppsDetailView.editModal.description') }}</p>

        <!-- Name -->
        <div>
          <label class="block text-sm font-medium text-fg mb-1.5">
            {{ $t('AppsDetailView.editModal.nameLabel') }}
          </label>
          <input
            v-model="editForm.name"
            type="text"
            class="field w-full px-3 py-2 text-sm focus:border-accent/60"
          />
        </div>

        <!-- Description -->
        <div>
          <label class="block text-sm font-medium text-fg mb-1.5">
            {{ $t('AppsDetailView.editModal.descLabel') }}
          </label>
          <MarkdownEditor
            v-model="editForm.description"
            :placeholder="$t('AppsCreateView.form.descPlaceholder')"
            :min-height-px="120"
            :max-height-px="320"
          />
          <p class="mt-1 text-xs text-fg-muted">{{ $t('AppsCreateView.form.descMarkdownHint') }}</p>
        </div>

        <!-- Image -->
        <div>
          <label class="block text-sm font-medium text-fg mb-1.5">
            {{ $t('AppsDetailView.editModal.imageLabel') }}
          </label>
          <ImageDropZone
            :preview-url="editImagePreview"
            :caption="editImageFile ? editImageFile.name : $t('AppsDetailView.editModal.currentImage')"
            :placeholder="$t('AppsDetailView.editModal.imageHint')"
            :remove-label="$t('AppsDetailView.editModal.imageRemove')"
            @select="chooseEditImage"
            @remove="removeEditImage"
          />
        </div>
      </div>
    </template>
    <template #footer>
      <div class="flex justify-end gap-3">
        <BaseButton variant="ghost" @click="closeEditModal" :disabled="saving">
          {{ $t('AppsDetailView.cancelButton') }}
        </BaseButton>
        <BaseButton variant="primary" @click="submitEdit" :disabled="saving">
          {{ saving ? $t('AppsDetailView.editModal.savingButton') : $t('AppsDetailView.editModal.saveButton') }}
        </BaseButton>
      </div>
    </template>
  </Modal>
</template>
