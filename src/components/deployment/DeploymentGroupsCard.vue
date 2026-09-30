<script setup lang="ts">
/**
 * Student groups of a deployment (from the persisted wizard input) with a
 * drill-down: the overview lists all groups, clicking one shows its
 * students. The selection is local to this card.
 */
import { computed, ref } from 'vue'
import { CircleArrowLeft } from 'lucide-vue-next'
import type { DeploymentGroup } from '@/services/deployment-input.service'
import Card from '@/components/ui/Card.vue'

const props = defineProps<{
  groups: DeploymentGroup[]
}>()

// Assignment key (``DeploymentGroup.index``) of the opened group.
const selectedGroup = ref<number | null>(null)

const selectGroup = (groupIndex: number) => {
  selectedGroup.value = groupIndex
}

const deselectGroup = () => {
  selectedGroup.value = null
}

const currentGroup = computed(() => {
  if (selectedGroup.value === null) return null
  return props.groups.find((group) => group.index === selectedGroup.value) ?? null
})
</script>

<template>
  <Card v-if="groups.length > 0" :title="$t('DeploymentDetailView.deploymentGroups')">

    <Transition mode="out-in" enter-active-class="transition-all duration-200 ease-out"
      enter-from-class="opacity-0 translate-x-2" enter-to-class="opacity-100 translate-x-0"
      leave-active-class="transition-all duration-200 ease-out absolute top-0 left-0 right-0"
      leave-from-class="opacity-100 translate-x-0" leave-to-class="opacity-0 -translate-x-2">
      <div v-if="currentGroup" key="detail" class="bg-line/[.04] rounded-lg p-4">

        <button @click="deselectGroup"
          class="flex items-center gap-2 text-fg hover:text-heading transition-colors mb-3 group">
          <CircleArrowLeft :size="20" class="group-hover:-translate-x-1 transition-transform" />
          <span class="text-sm font-medium">{{ $t('DeploymentDetailView.deploymentGroupsBack') }}</span>
        </button>

        <div class="flex items-center gap-3 mb-4 pb-3 border-b border-subtle">
          <div class="avatar w-8 h-8 rounded-full flex items-center justify-center">
            <span class="text-fg font-semibold text-sm">{{ currentGroup.index + 1 }}</span>
          </div>
          <div data-testid="group-name" class="text-lg font-semibold text-heading">{{ currentGroup.name }}</div>
        </div>

        <div class="space-y-2">
          <div class="text-xs text-fg-muted mb-2">
            {{ $t('DeploymentDetailView.deploymentStudentCount', {
              n: currentGroup?.students?.length ||
                0
            }, currentGroup?.students?.length || 0) }}
          </div>
          <div v-for="(student, idx) in currentGroup.students" :key="student"
            class="flex items-center gap-3 bg-panel rounded-lg px-3 py-2 border border-subtle">
            <div
              class="avatar w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold">
              {{ Number(idx) + 1 }}
            </div>
            <span class="font-mono text-sm text-fg">{{ student }}</span>
          </div>
        </div>
      </div>

      <div v-else key="overview" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <button v-for="group in groups" :key="group.index" type="button" data-testid="group-card"
          class="hover-tint rounded-panel border border-subtle p-4 text-left transition-colors hover:border-strong"
          @click="selectGroup(group.index)">
          <span class="mb-2 flex items-center gap-3">
            <span class="avatar flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold">
              {{ group.index + 1 }}
            </span>
            <span class="font-semibold text-heading">{{ group.name }}</span>
          </span>
          <span class="ml-11 block text-sm text-fg-muted">
            {{ $t('DeploymentDetailView.deploymentStudentCount', { n: group.students.length },
              group.students.length) }}
          </span>
        </button>
      </div>
    </Transition>
  </Card>
</template>
