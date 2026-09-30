<script setup lang="ts">
/**
 * Compact scope indicator for the deployment-wizard variable cards.
 *
 * Wraps ``Badge`` with scope-specific copy:
 *   * ``team`` → badge "Pro Team" + ``Users`` icon
 *   * ``user`` → badge "Pro User" + ``User`` icon
 *   * ``all``/undefined → nothing rendered (the calm default)
 *
 * ``emphasis`` is the hue-free label tone. Accepts ``undefined`` so
 * callers can pass ``v.varScope`` without a guard (the backend omits it when "all").
 */
import { Users, User } from 'lucide-vue-next'
import Badge from './Badge.vue'

defineProps<{
  scope?: 'all' | 'team' | 'user'
}>()
</script>

<template>
  <Badge v-if="scope === 'team'" tone="emphasis">
    <Users :size="12" class="mr-1" aria-hidden="true" />
    <span>Pro Team</span>
  </Badge>
  <Badge v-else-if="scope === 'user'" tone="emphasis">
    <User :size="12" class="mr-1" aria-hidden="true" />
    <span>Pro User</span>
  </Badge>
  <!-- scope === 'all' or undefined: render nothing (the default needs no marker). -->
</template>
