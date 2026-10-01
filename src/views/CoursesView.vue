<script setup lang="ts">
import { ROUTE_NAMES } from '@/router/route-names'
import { computed, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { GraduationCap, Trash2, Plus } from 'lucide-vue-next'
import { useCourseStore } from '@/stores/course.store'
import { useToast } from '@/composables/useToast'
import { getErrorDetailMessage } from '@/utils/http-error'
import { useRole } from '@/composables/useRole'
import { useCourseMemberCounts } from '@/composables/useCourseMemberCounts'
import { useI18n } from 'vue-i18n'
import ActionMenu from '@/components/ui/ActionMenu.vue'
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable.vue'
import type { MenuItem } from '@/components/ui/menu'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import Modal from '@/components/ui/Modal.vue'
import ConfirmModal from '@/components/ui/ConfirmModal.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import EntityListState from '@/components/ui/EntityListState.vue'

const courseStore = useCourseStore()
const toast = useToast()
// Permission mirror: course CRUD is staff-only in the UI (the backend still
// enforces course-teacher membership on edit/delete). ``isStaff`` covers
// teacher + admin which matches the previous ``can.editCourse`` /
// ``can.createCourse`` / ``can.deleteCourse`` semantics.
const { isStaff } = useRole()
const router = useRouter()
const { t } = useI18n()

const showModal = ref(false)
const formData = ref({ name: '' })

const showDeleteModal = ref(false)
const courseToDelete = ref<{ courseId: string; name: string } | null>(null)
const isDeleting = ref(false)
const { counts: memberCounts, load: loadMemberCounts } = useCourseMemberCounts()

onMounted(async () => {
  try {
    await courseStore.fetchCourses()
    // ``fetchCourses`` swallows the error (``rethrow: false``) and only records
    // it in the store, so the toast has to check the store state.
    if (courseStore.error) {
      toast.error(t('CoursesView.toasts.loadError'))
      return
    }
    if (isStaff.value) {
      await loadMemberCounts(courseStore.courses.map((c) => c.courseId))
    }
  } catch {
    toast.error(t('CoursesView.toasts.loadError'))
  }
})

const openCreateModal = () => {
  formData.value = { name: '' }
  showModal.value = true
}

const saveCourse = async () => {
  try {
    const created = await courseStore.createCourse({ name: formData.value.name })
    toast.success(t('CoursesView.toasts.createSuccess'))
    showModal.value = false

    // Navigate to the detail page right after creation.
    if (created?.courseId) {
      router.push({ name: ROUTE_NAMES.coursesDetail, params: { id: created.courseId } })
    }
  } catch (error: any) {
    toast.error(getErrorDetailMessage(error) || t('CoursesView.toasts.createError'))
  }
}

const requestDelete = (course: { courseId: string; name: string }) => {
  courseToDelete.value = course
  showDeleteModal.value = true
}

const closeDeleteModal = () => {
  if (isDeleting.value) return
  showDeleteModal.value = false
  courseToDelete.value = null
}

const confirmDelete = async () => {
  if (!courseToDelete.value) return
  const { courseId } = courseToDelete.value
  isDeleting.value = true
  try {
    await courseStore.deleteCourse(courseId)
    delete memberCounts.value[courseId]
    toast.success(t('CoursesView.toasts.deleteSuccess'))
    showDeleteModal.value = false
    courseToDelete.value = null
  } catch (error: any) {
    toast.error(getErrorDetailMessage(error) || t('CoursesView.toasts.deleteError'))
  } finally {
    isDeleting.value = false
  }
}

type Course = (typeof courseStore.courses)[number]

// Member counts are only loaded for staff, so only they get the column.
const columns = computed<DataTableColumn[]>(() => [
  { id: 'name', label: t('CoursesView.columns.course') },
  ...(isStaff.value ? [{ id: 'members', label: t('CoursesView.columns.members'), class: 'w-[200px]' }] : []),
  ...(isStaff.value ? [{ id: 'actions', label: t('CoursesView.columns.actions'), class: 'w-16', align: 'right' as const, hideLabel: true, interactive: true }] : []),
])

const memberLabel = (n: number) => `${n} ${n === 1 ? t('CoursesView.memberSingular') : t('CoursesView.memberPlural')}`

const rowMenu = computed<MenuItem[]>(() => [
  { id: 'delete', label: t('CoursesView.deleteTitle'), icon: Trash2, danger: true },
])
</script>

<template>
  <div class="max-w-page">
    <PageHeader :title="$t('CoursesView.title')" :subtitle="$t('CoursesView.subtitle')">
      <template #actions>
        <BaseButton v-if="isStaff" @click="openCreateModal">
          <Plus :size="16" :stroke-width="2.2" aria-hidden="true" />
          {{ $t('CoursesView.newCourse') }}
        </BaseButton>
      </template>
    </PageHeader>

    <EntityListState
      :is-loading="courseStore.isLoading && courseStore.courses.length === 0"
      :is-empty="!courseStore.isLoading && courseStore.courses.length === 0"
      :icon="GraduationCap"
      :empty-message="$t('CoursesView.noCourses')"
      :loading-message="$t('CoursesView.loading')"
    >
      <template #empty-action>
        <BaseButton v-if="isStaff" @click="openCreateModal">
          {{ $t('CoursesView.createFirst') }}
        </BaseButton>
      </template>

      <div class="surface-panel overflow-hidden">
        <DataTable
          :columns="columns"
          :rows="courseStore.courses"
          :row-key="(c: Course) => c.courseId"
          :row-to="(c: Course) => ({ name: ROUTE_NAMES.coursesDetail, params: { id: c.courseId } })"
          :caption="$t('CoursesView.title')"
        >
          <template #cell-name="{ row }">
            <span class="font-semibold text-heading" data-testid="course-name">{{ row.name }}</span>
          </template>
          <template #cell-members="{ row }">
            <span class="tabular-nums text-fg-muted">{{ memberLabel(memberCounts[row.courseId] ?? 0) }}</span>
          </template>
          <template #cell-actions="{ row }">
            <ActionMenu
              :items="rowMenu"
              :label="$t('CoursesView.actionsFor', { name: row.name })"
              @select="(id) => id === 'delete' && requestDelete(row)"
            />
          </template>
        </DataTable>
      </div>
    </EntityListState>

    <Modal :show="showModal" @close="showModal = false">
      <template #header>
        <h2 class="text-xl font-semibold">{{ $t('CoursesView.createModal.title') }}</h2>
      </template>

      <template #body>
        <div class="space-y-5">
          <p class="text-sm text-fg-muted">
            {{ $t('CoursesView.createModal.intro') }}
          </p>
          <div>
            <label class="block text-sm font-medium text-fg mb-1.5">
              {{ $t('CoursesView.createModal.nameLabel') }}
            </label>
            <BaseInput v-model="formData.name" :placeholder="$t('CoursesView.createModal.namePlaceholder')" required @keyup.enter="saveCourse" />
          </div>
        </div>
      </template>

      <template #footer>
        <div class="flex justify-end gap-3">
          <BaseButton variant="ghost" @click="showModal = false">
            {{ $t('CoursesView.createModal.cancel') }}
          </BaseButton>
          <BaseButton @click="saveCourse" :disabled="!formData.name">
            {{ $t('CoursesView.createModal.create') }}
          </BaseButton>
        </div>
      </template>
    </Modal>

    <ConfirmModal
      :show="showDeleteModal"
      :busy="isDeleting"
      :title="$t('CoursesView.deleteModal.title')"
      :confirm-label="$t('CoursesView.deleteModal.delete')"
      :busy-label="$t('CoursesView.deleteModal.deleting')"
      @close="closeDeleteModal"
      @confirm="confirmDelete"
    >
      <div class="space-y-3">
        <i18n-t keypath="CoursesView.deleteModal.confirmPrompt" tag="p" class="text-fg">
          <template #name><strong>{{ courseToDelete?.name }}</strong></template>
        </i18n-t>
        <p class="text-sm text-fg-muted">
          {{ $t('CoursesView.deleteModal.warning') }}
        </p>
      </div>
    </ConfirmModal>
  </div>
</template>