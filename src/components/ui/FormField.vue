<script setup lang="ts">
/**
 * Label, hint and error around one form control. The default slot receives
 * ``id``, ``describedBy`` and ``invalid``; bind them to the control so the
 * label is connected to it and the messages are read out with it:
 *
 *   <FormField label="Name" v-slot="{ id, describedBy, invalid }">
 *     <BaseInput :id="id" :aria-describedby="describedBy" :aria-invalid="invalid" />
 *   </FormField>
 */
import { computed, useId } from 'vue'

const props = defineProps<{
  label: string
  hint?: string
  error?: string
  required?: boolean
}>()

const id = useId()
const hintId = `${id}-hint`
const errorId = `${id}-error`

const describedBy = computed(() => {
  const ids = [props.hint ? hintId : '', props.error ? errorId : ''].filter(Boolean)
  return ids.length ? ids.join(' ') : undefined
})
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <label :for="id" class="text-sm font-semibold text-fg">
      {{ label }}<span v-if="required" class="text-fg-muted" aria-hidden="true"> *</span>
    </label>
    <slot :id="id" :described-by="describedBy" :invalid="!!error" />
    <p v-if="hint" :id="hintId" class="text-sm text-fg-muted">{{ hint }}</p>
    <p v-if="error" :id="errorId" class="text-sm text-danger" role="alert">{{ error }}</p>
  </div>
</template>
