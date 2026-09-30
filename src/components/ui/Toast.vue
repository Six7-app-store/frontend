<script setup lang="ts">
/**
 * Short feedback after an action, stacked below the topbar on the right.
 * The icon carries the tone; errors are announced right away (``alert``),
 * everything else politely (``status``). A click dismisses a toast.
 */
import type { Component } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { AlertOctagon, AlertTriangle, CheckCircle, Info, X } from 'lucide-vue-next'
import { useToastStore } from '@/stores/toast.store'

const toastStore = useToastStore()
const { toasts } = storeToRefs(toastStore)
const { removeToast } = toastStore
const { t } = useI18n()

// Spelled out, not built from the type: Tailwind only emits classes it finds verbatim.
const ICON: Record<string, { icon: Component; class: string }> = {
  success: { icon: CheckCircle, class: 'text-success-dot' },
  error: { icon: AlertOctagon, class: 'text-danger' },
  warning: { icon: AlertTriangle, class: 'text-warning-dot' },
  info: { icon: Info, class: 'text-icon' },
}
const iconOf = (type: string) => ICON[type] ?? ICON.info!
</script>

<template>
  <Teleport to="body">
    <div class="pointer-events-none fixed right-4 top-[calc(var(--topbar-h)+12px)] z-[60] flex w-[24rem] max-w-[calc(100vw-2rem)] flex-col gap-3">
      <TransitionGroup name="toast">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          class="toast surface-overlay pointer-events-auto flex cursor-pointer items-start gap-3 px-4 py-3"
          :role="toast.type === 'error' ? 'alert' : 'status'"
          @click="removeToast(toast.id)"
        >
          <component :is="iconOf(toast.type).icon" :size="18" class="mt-0.5 shrink-0" :class="iconOf(toast.type).class" aria-hidden="true" />
          <p class="min-w-0 flex-1 break-words text-base text-fg">{{ toast.message }}</p>
          <button
            type="button"
            class="btn btn-ghost btn-icon -mr-1 -mt-0.5 h-[26px] w-[26px] shrink-0"
            :aria-label="t('common.close')"
            @click.stop="removeToast(toast.id)"
          >
            <X :size="14" aria-hidden="true" />
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>
