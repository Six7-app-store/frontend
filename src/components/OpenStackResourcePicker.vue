<script setup lang="ts">
/**
 * OpenStack resource picker.
 *
 * Rendered in the wizard for variables whose backend response carries an
 * ``osType`` (set only when the variable's ``description`` has an
 * ``@openstack:<type>`` marker; see ``backend/app/routers/apps.py``).
 *
 * Loads the matching list from the backend (60s backend cache + a frontend
 * display cache shared between picker instances) and shows a single- or
 * multi-select.
 *
 * Wire format (``v-model``):
 *  - osMode='id'   → stores the UUID(s)
 *  - osMode='name' → stores the name(s)
 *  - multi=false   → string
 *  - multi=true    → Array<String>; a comma-separated string is turned into
 *                    an array on mount
 *
 * The UI always shows the display name even when the stored value is a UUID;
 * lookups go through ``composables/useOpenStackResourceCache``.
 *
 * Edge cases handled:
 *  - 412 credentials missing → compact hint instead of an empty list
 *  - 502 OpenStack down → message + retry + free-text input
 *  - default value is a UUID whose name isn't cached yet → show the raw value
 *    with an "external" badge until the cache loads
 *  - empty list → hint with free-text option
 *  - subnet filter: ``filterNetworkId`` can change at runtime → reactive reload
 *  - dropdown placement, flip-up and cleanup: ``useFloatingDropdown``
 */
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { AlertTriangle, ChevronDown, ChevronUp, Pencil, RefreshCw } from 'lucide-vue-next'
import ResourcePickerPanel from '@/components/openstack-picker/ResourcePickerPanel.vue'
import ResourcePickerSelection from '@/components/openstack-picker/ResourcePickerSelection.vue'
import { useToast } from '@/composables/useToast'
import { useFloatingDropdown } from '@/composables/useFloatingDropdown'
import { useOsResourceList } from '@/composables/useOsResourceList'
import { getDisplayName, ensureLoaded } from '@/composables/useOpenStackResourceCache'
import { splitCsv } from '@/services/variable-types'
import {
  filterResources,
  selectedKeysOf,
  type ResourceItem,
} from '@/services/openstack-resource-presentation.service'
import type { OsResourceType } from '@/api/openstack-resources.api'

type Mode = 'id' | 'name'

const props = defineProps<{
  osType: OsResourceType
  osMode?: Mode
  multi?: boolean
  modelValue?: string | string[] | null
  filterNetworkId?: string | null
  azService?: 'compute' | 'network' | 'volume'
  placeholder?: string
  allowFreeText?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', val: string | string[]): void
}>()

const toast = useToast()
const { t } = useI18n()

const { items, isLoading, errorReason, errorMessage, load } = useOsResourceList(() => ({
  type: props.osType,
  networkId: props.filterNetworkId,
  azService: props.azService,
}))

const searchQuery = ref('')
const isFreeTextMode = ref(false)
const freeTextValue = ref('')

const triggerEl = ref<HTMLElement | null>(null)
const dropdownEl = ref<HTMLElement | null>(null)
const {
  isOpen,
  popupStyle,
  close: closeDropdown,
  toggle: toggleDropdown,
} = useFloatingDropdown(triggerEl, dropdownEl, {
  onClose: () => { searchQuery.value = '' },
})

// ----------------------------------------------------------------
// Selection
// ----------------------------------------------------------------
const selectedKeys = computed(() => selectedKeysOf(props.modelValue, !!props.multi))

const valueOf = (item: ResourceItem): string =>
  props.osMode === 'id' ? item.id : item.name

const isSelected = (item: ResourceItem): boolean =>
  selectedKeys.value.has(valueOf(item))

/**
 * Display list of the current selection. Two sources: this picker's ``items``
 * if loaded, otherwise the shared display cache. Falls back to the raw value
 * marked ``known: false`` when neither has it.
 */
const selectedDisplay = computed(() => {
  const mode: Mode = props.osMode || 'name'
  return [...selectedKeys.value].map((key) => {
    const local = items.value.find((it) => valueOf(it) === key)
    if (local) return { value: key, displayName: local.name, known: true }
    const cached = getDisplayName(props.osType, mode, key)
    if (cached) return { value: key, displayName: cached.name, known: cached.known }
    return { value: key, displayName: key, known: false }
  })
})

const filteredItems = computed(() => filterResources(items.value, searchQuery.value, isSelected))

// Multi-select always emits an Array, however the parent initialised
// ``modelValue`` — the backend's ``list(string)`` HCL type requires one.
function toggle(item: ResourceItem) {
  const key = valueOf(item)
  if (props.multi) {
    const current = new Set(selectedKeys.value)
    if (current.has(key)) current.delete(key)
    else current.add(key)
    emit('update:modelValue', Array.from(current))
  } else {
    emit('update:modelValue', isSelected(item) ? '' : key)
    closeDropdown()
  }
}

function removeChip(value: string) {
  if (!props.multi) {
    emit('update:modelValue', '')
    return
  }
  const current = new Set(selectedKeys.value)
  current.delete(value)
  emit('update:modelValue', Array.from(current))
}

// ----------------------------------------------------------------
// Loading / Refresh
// ----------------------------------------------------------------
async function handleRefresh() {
  // Remember which selected entries were known before, to warn about the
  // ones the reload no longer has (e.g. a flavor deleted in the project).
  const previouslyKnown = new Map<string, string>()
  for (const entry of selectedDisplay.value) {
    if (entry.known) previouslyKnown.set(entry.value, entry.displayName)
  }
  await load({ forceRefresh: true })
  if (errorReason.value !== null) return
  const lost = [...previouslyKnown]
    .filter(([key]) => !items.value.some((it) => valueOf(it) === key))
    .map(([key, name]) => name || key)
  if (lost.length > 0) {
    toast.warning(t('openstackPicker.toasts.removed', { label: lost.join(', ') }))
  } else {
    toast.success(t('openstackPicker.toasts.listRefreshed'))
  }
}

// Reload when the subnet filter / AZ service / os type changes.
watch(
  () => [props.filterNetworkId, props.azService, props.osType],
  () => {
    if (!isFreeTextMode.value) load()
  },
)

onMounted(() => {
  // Some persisted ``list(string)`` values arrive as a comma-separated
  // string; normalise once so the parent works with an array.
  if (props.multi && typeof props.modelValue === 'string' && props.modelValue.trim()) {
    emit('update:modelValue', splitCsv(props.modelValue))
  }
  load()
  // Feed the shared cache so other components (summary) have the names.
  if (!props.filterNetworkId) {
    ensureLoaded(props.osType)
  }
})

// ----------------------------------------------------------------
// Free-text fallback
// ----------------------------------------------------------------
function enableFreeText() {
  isFreeTextMode.value = true
  freeTextValue.value = props.multi
    ? (Array.isArray(props.modelValue) ? props.modelValue.join(', ') : (props.modelValue || ''))
    : (typeof props.modelValue === 'string' ? props.modelValue : '')
  closeDropdown()
}

function disableFreeText() {
  isFreeTextMode.value = false
  load()
}

function onFreeTextInput(val: string) {
  freeTextValue.value = val
  // Multi mode splits on commas, so "uuid-1, uuid-2" lands as an array.
  emit('update:modelValue', props.multi ? splitCsv(val) : val.trim())
}

// ----------------------------------------------------------------
// Labels
// ----------------------------------------------------------------
// Resource type as shown to the user; keys mirror ``OsResourceType``.
function osTypeLabel(): string {
  return t(`openstackPicker.types.${props.osType}`)
}

const placeholderText = computed(() => {
  if (props.placeholder) return props.placeholder
  return props.multi
    ? t('openstackPicker.selectPlural', { type: osTypeLabel() })
    : t('openstackPicker.selectSingular', { type: osTypeLabel() })
})
</script>

<template>
  <div class="space-y-2">
    <!-- ============================================================ -->
    <!-- Free-text mode (fallback when OpenStack is down, or chosen explicitly) -->
    <!-- ============================================================ -->
    <div v-if="isFreeTextMode" class="space-y-2">
      <div class="flex items-center justify-between">
        <span class="text-xs text-fg-muted flex items-center gap-1">
          <Pencil :size="12" />
          {{ t('openstackPicker.manualLabel', { mode: osMode === 'id' ? t('openstackPicker.modeUuid') : t('openstackPicker.modeName') }) }}
        </span>
        <button
          @click="disableFreeText"
          type="button"
          class="text-xs text-accent-fg hover:text-accent-fg underline"
        >
          {{ t('openstackPicker.showList') }}
        </button>
      </div>
      <input
        :value="freeTextValue"
        @input="onFreeTextInput(($event.target as HTMLInputElement).value)"
        type="text"
        :placeholder="multi ? t('openstackPicker.multiPlaceholder') : t('openstackPicker.enterValue', { type: osTypeLabel(), mode: osMode === 'id' ? t('openstackPicker.modeUuid') : t('openstackPicker.modeName') })"
        class="field w-full px-3 py-2 focus:border-accent/60 font-mono text-sm"
      />
    </div>

    <!-- ============================================================ -->
    <!-- Credentials missing → compact inline hint. The full banner is rendered -->
    <!-- once by the parent above the variables grid; here only a subtle per-picker note. -->
    <!-- ============================================================ -->
    <div v-else-if="errorReason === 'credentials_missing'">
      <div
        class="flex items-center gap-2 px-3 py-2 rounded-lg border-2 border-warning-dot/30 bg-warning-dot/10 text-warning text-sm"
      >
        <AlertTriangle :size="14" class="flex-shrink-0" />
        <span>{{ t('openstackPicker.credentialsRequired') }}</span>
      </div>
      <button
        v-if="allowFreeText"
        @click="enableFreeText"
        type="button"
        class="mt-2 text-xs text-accent-fg hover:text-accent-fg underline"
      >
        {{ t('openstackPicker.enterManuallyInstead', { mode: osMode === 'id' ? t('openstackPicker.modeUuid') : t('openstackPicker.modeName') }) }}
      </button>
    </div>

    <!-- ============================================================ -->
    <!-- Picker (single or multi) — trigger button + floating panel -->
    <!-- ============================================================ -->
    <div v-else class="space-y-2">
      <div class="flex items-start gap-2">
        <div class="flex-grow min-w-0">
          <button
            ref="triggerEl"
            @click="toggleDropdown"
            type="button"
            class="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg border-2 border-subtle bg-panel hover:border-strong transition focus:border-accent/60 text-left"
          >
            <ResourcePickerSelection
              :selected="selectedDisplay"
              :multi="multi"
              :placeholder="placeholderText"
              @remove="removeChip" />
            <component :is="isOpen ? ChevronUp : ChevronDown" :size="16" class="text-fg-muted flex-shrink-0" />
          </button>
        </div>

        <button
          @click="handleRefresh"
          type="button"
          :disabled="isLoading"
          class="flex-shrink-0 p-2 text-fg-muted hover:text-accent-fg disabled:opacity-50 transition"
          :title="t('openstackPicker.refreshList')"
        >
          <RefreshCw :size="16" :class="isLoading ? 'animate-spin' : ''" />
        </button>
      </div>
    </div>

    <!-- Floating dropdown — teleported to body level -->
    <Teleport to="body">
      <div
        v-if="isOpen && !isFreeTextMode && errorReason !== 'credentials_missing'"
        ref="dropdownEl"
        :style="popupStyle"
        class="border-2 border-subtle rounded-lg bg-panel shadow-2xl overflow-hidden flex flex-col"
        @mousedown.stop
      >
        <ResourcePickerPanel
          v-model:search="searchQuery"
          :items="filteredItems"
          :is-selected="isSelected"
          :is-loading="isLoading"
          :error-reason="errorReason"
          :error-message="errorMessage"
          :type-label="osTypeLabel()"
          :os-mode="osMode"
          :multi="multi"
          :allow-free-text="allowFreeText"
          @toggle="toggle"
          @refresh="handleRefresh"
          @free-text="enableFreeText" />
      </div>
    </Teleport>
  </div>
</template>
