<script setup lang="ts">
/**
 * Content of the picker's floating panel: search, the load states, the
 * resource rows and a footer saying what gets stored. Focuses the search
 * when it appears.
 */
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { AlertTriangle, Check, Pencil, Search } from 'lucide-vue-next'
import Spinner from '@/components/ui/Spinner.vue'
import type { ResourceItem } from '@/services/openstack-resource-presentation.service'

defineProps<{
  items: ResourceItem[]
  isSelected: (item: ResourceItem) => boolean
  isLoading: boolean
  errorReason: 'credentials_missing' | 'unavailable' | null
  errorMessage: string
  /** The resource type as shown to the user. */
  typeLabel: string
  osMode?: 'id' | 'name'
  multi?: boolean
  allowFreeText?: boolean
}>()

const searchQuery = defineModel<string>('search', { required: true })

defineEmits<{
  toggle: [item: ResourceItem]
  refresh: []
  freeText: []
}>()

const { t } = useI18n()
const searchInputEl = ref<HTMLInputElement | null>(null)
onMounted(() => searchInputEl.value?.focus())
</script>

<template>
  <div class="contents">
    <!-- Search -->
    <div class="relative border-b border-subtle p-2 flex-shrink-0">
      <Search :size="14" class="absolute left-4 top-1/2 -translate-y-1/2 text-icon" />
      <input
        ref="searchInputEl"
        v-model="searchQuery"
        type="text"
        :placeholder="t('openstackPicker.searchPlaceholder', { type: typeLabel })"
        class="field w-full pl-7 pr-2 py-1.5 text-sm border-transparent"
      />
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="p-6 text-center text-fg-muted text-sm">
      <Spinner :size="20" class="inline-block mb-2" />
      <p>{{ t('openstackPicker.loading', { type: typeLabel }) }}</p>
    </div>

    <!-- Error: OpenStack down -->
    <div v-else-if="errorReason === 'unavailable'" class="p-4">
      <div class="flex items-start gap-2 text-warning mb-2">
        <AlertTriangle :size="16" class="flex-shrink-0 mt-0.5" />
        <div class="text-sm">
          <p class="font-medium">{{ t('openstackPicker.unreachable') }}</p>
          <p class="text-xs text-warning mt-1">{{ errorMessage }}</p>
        </div>
      </div>
      <div class="flex gap-2 mt-2">
        <button
          @click="$emit('refresh')"
          type="button"
          class="text-xs px-2 py-1 rounded bg-line/[.07] text-fg hover:bg-line/[.12]"
        >
          {{ t('openstackPicker.retry') }}
        </button>
        <button
          v-if="allowFreeText"
          @click="$emit('freeText')"
          type="button"
          class="text-xs px-2 py-1 rounded bg-line/[.07] text-fg hover:bg-line/[.12]"
        >
          {{ t('openstackPicker.enterManually') }}
        </button>
      </div>
    </div>

    <!-- Empty -->
    <div v-else-if="items.length === 0" class="p-6 text-center text-fg-muted text-sm">
      <p v-if="searchQuery">{{ t('openstackPicker.noHits', { query: searchQuery }) }}</p>
      <template v-else>
        <p class="mb-2">{{ t('openstackPicker.emptyProject', { type: typeLabel }) }}</p>
        <button
          v-if="allowFreeText"
          @click="$emit('freeText')"
          type="button"
          class="text-xs text-accent-fg hover:text-heading underline inline-flex items-center gap-1"
        >
          <Pencil :size="12" /> {{ t('openstackPicker.enterManually') }}
        </button>
      </template>
    </div>

    <!-- Items — flex-grow + overflow-auto so max-height from popupStyle
         bounds the scrolling region -->
    <ul v-else class="flex-grow overflow-y-auto divide-y">
      <li
        v-for="item in items"
        :key="item.id || item.name"
        @click="$emit('toggle', item)"
        class="flex items-center gap-3 px-3 py-2 hover:bg-line/[.07] cursor-pointer transition"
        :class="isSelected(item) ? 'bg-line/[.07]' : ''"
      >
        <div
          class="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 border"
          :class="
            isSelected(item)
              ? 'bg-accent border-accent'
              : 'bg-panel border-strong'
          "
        >
          <Check v-if="isSelected(item)" :size="12" class="text-on-accent" />
        </div>

        <div class="flex-grow min-w-0">
          <div class="flex items-center gap-2">
            <span class="font-medium text-fg text-sm truncate">{{ item.name || t('openstackPicker.unnamed') }}</span>
            <span
              v-if="item.tertiary"
              class="text-xs px-1.5 py-0.5 rounded bg-line/[.07] text-fg-muted font-medium flex-shrink-0"
            >
              {{ item.tertiary }}
            </span>
          </div>
          <div v-if="item.secondary" class="text-xs text-fg-muted truncate">
            {{ item.secondary }}
          </div>
          <!-- Show the ID in id-mode as a secondary disambiguation hint;
               the ``name`` remains the main label. -->
          <div v-if="osMode === 'id' && item.id" class="text-xs text-fg-muted font-mono truncate">
            {{ item.id }}
          </div>
        </div>
      </li>
    </ul>

    <!-- Footer with mode hint -->
    <div class="border-t border-subtle px-3 py-1.5 bg-line/[.04] flex items-center justify-between text-[11px] text-fg-muted flex-shrink-0">
      <span>
        <template v-if="osMode === 'id'">{{ t('openstackPicker.hints.storesUuid') }}</template>
        <template v-else>{{ t('openstackPicker.hints.storesName') }}</template>
        <template v-if="multi"> · {{ t('openstackPicker.hints.multiSelect') }}</template>
      </span>
      <button
        v-if="allowFreeText"
        @click="$emit('freeText')"
        type="button"
        class="text-fg hover:text-heading inline-flex items-center gap-1"
      >
        <Pencil :size="10" /> {{ t('openstackPicker.enterManuallyShort') }}
      </button>
    </div>
  </div>
</template>
