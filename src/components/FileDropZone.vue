<script lang="ts" setup>
/**
 * FileDropZone — drop-or-click upload widget.
 *
 * Single mode (default): one file bound with ``v-model`` as a ready-to-ship
 * ``DeploymentFile``; once set it shows name, size and a remove button.
 *
 * ``multiple``: takes any number of files at once and emits them as
 * ``files``; it stays a drop zone, the caller shows where they went (the
 * wizard matches them to people or teams by file name).
 *
 * Files over ``maxBytes`` are refused with an inline error (and ``error``).
 */
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { AlertCircle, Upload, FileText, X } from 'lucide-vue-next'
import type { DeploymentFile } from '@/types'
import { formatBytes } from '@/utils/format'
import { MAX_DEPLOYMENT_FILE_BYTES, readDeploymentFile } from '@/utils/deployment-file'

const props = withDefaults(defineProps<{
  /** ``accept`` filter for the native file picker (e.g. ``".java,.txt"``). */
  accept?: string
  /** Per-file cap in bytes. */
  maxBytes?: number
  /** The chosen file in single mode; re-shown when the wizard is re-entered. */
  modelValue?: DeploymentFile | null
  /** Label for the empty state, e.g. "Aufgabenstellung". */
  label?: string
  /** A second line under the label, e.g. how files are matched. */
  hint?: string
  disabled?: boolean
  multiple?: boolean
}>(), {
  accept: '*',
  maxBytes: MAX_DEPLOYMENT_FILE_BYTES,
  modelValue: null,
  label: '',
  hint: '',
  disabled: false,
  multiple: false,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: DeploymentFile | null): void
  (e: 'change', value: DeploymentFile | null): void
  (e: 'files', value: DeploymentFile[]): void
  (e: 'error', message: string): void
}>()

const fileInputRef = ref<HTMLInputElement | null>(null)
const isDragging = ref(false)
const { t } = useI18n()
// Shown inline; the parent gets the same text through ``error``.
const localError = ref<string>('')

const hasValue = computed(() => !props.multiple && !!props.modelValue)
const maxMb = computed(() => Math.round(props.maxBytes / 1024 / 1024))

function fail(message: string) {
  localError.value = message
  emit('error', message)
}

async function processFiles(list: FileList | File[] | null | undefined) {
  if (props.disabled || !list) return
  localError.value = ''
  const files = Array.from(list)
  if (files.length === 0) return
  const tooLarge = files.filter((f) => f.size > props.maxBytes)
  const fitting = files.filter((f) => f.size <= props.maxBytes)
  try {
    if (props.multiple) {
      const payloads = await Promise.all(fitting.map(readDeploymentFile))
      if (payloads.length > 0) emit('files', payloads)
    } else if (fitting[0]) {
      const payload = await readDeploymentFile(fitting[0])
      emit('update:modelValue', payload)
      emit('change', payload)
    }
  } catch (e: any) {
    fail(e?.message || t('fileDropZone.readError'))
    return
  }
  if (tooLarge.length > 0) {
    fail(props.multiple
      ? t('fileDropZone.someTooLarge', { mb: maxMb.value, names: tooLarge.map((f) => f.name).join(', ') })
      : t('fileDropZone.tooLarge', { mb: maxMb.value }))
  }
}

const triggerInput = () => {
  if (props.disabled) return
  fileInputRef.value?.click()
}

const onFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  processFiles(target.files)
  // Allow re-selecting the same file later — without this the change
  // event wouldn't fire on identical re-pick.
  target.value = ''
}

const onDrop = (event: DragEvent) => {
  isDragging.value = false
  if (props.disabled) return
  const files = event.dataTransfer?.files
  processFiles(props.multiple ? files : files ? [files[0]!].filter(Boolean) : null)
}

const clearFile = () => {
  if (props.disabled) return
  emit('update:modelValue', null)
  emit('change', null)
}
</script>

<template>
  <div class="space-y-1">
    <input
      ref="fileInputRef"
      type="file"
      :accept="accept"
      :multiple="multiple"
      :disabled="disabled"
      class="hidden"
      data-testid="file-input"
      @change="onFileChange"
    />

    <!-- Empty state: drop zone + click to pick. -->
    <button
      v-if="!hasValue"
      type="button"
      class="drop-zone flex w-full items-center gap-3 text-left"
      :class="[
        multiple ? 'gap-4 p-5' : 'px-4 py-3',
        isDragging ? 'drop-zone-active' : '',
        disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
      ]"
      :disabled="disabled"
      data-testid="drop-zone"
      @dragover.prevent="!disabled && (isDragging = true)"
      @dragleave.prevent="isDragging = false"
      @drop.prevent="onDrop"
      @click="triggerInput"
    >
      <Upload :size="20" class="shrink-0 text-icon" aria-hidden="true" />
      <span class="flex min-w-0 flex-1 flex-col gap-0.5">
        <span class="truncate text-sm text-fg">
          <span v-if="label" class="font-medium" :class="{ 'font-semibold text-base': multiple }">{{ label }}<template v-if="!multiple">: </template></span>
          <span v-if="!multiple" class="text-fg-muted">{{ t('fileDropZone.pick') }}</span>
        </span>
        <span class="text-xs text-fg-muted">
          <template v-if="hint">{{ hint }} </template>{{ t('fileDropZone.maxSize', { mb: maxMb }) }}
        </span>
      </span>
    </button>

    <!-- Filled state (single mode): show name + size + remove button. -->
    <div
      v-else
      class="flex items-center gap-3 rounded-md border bg-line/[.04] px-4 py-3"
    >
      <FileText :size="20" class="shrink-0 text-icon" aria-hidden="true" />
      <div class="min-w-0 flex-1">
        <div v-if="label" class="mb-0.5 text-xs text-fg-muted">{{ label }}</div>
        <div class="truncate text-sm font-medium text-fg">{{ modelValue!.name }}</div>
        <div class="text-xs text-fg-muted">
          {{ formatBytes(modelValue!.size) }}
        </div>
      </div>
      <button
        v-if="!disabled"
        type="button"
        class="rounded p-1 text-fg-muted hover:bg-line/[.12] hover:text-danger"
        :title="t('fileDropZone.remove')"
        :aria-label="t('fileDropZone.remove')"
        @click.stop="clearFile"
      >
        <X :size="16" aria-hidden="true" />
      </button>
    </div>

    <p v-if="localError" class="flex items-center gap-1.5 text-xs text-danger" role="alert">
      <AlertCircle :size="14" class="shrink-0" aria-hidden="true" />
      {{ localError }}
    </p>
  </div>
</template>
