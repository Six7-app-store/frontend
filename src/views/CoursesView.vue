<script setup lang="ts">
import { ROUTE_NAMES } from '@/router/route-names'
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { GraduationCap, Trash2, Plus, Users } from 'lucide-vue-next'
import { useCourseStore } from '@/stores/course.store'
import { useToast } from '@/composables/useToast'
import { getErrorDetailMessage } from '@/utils/http-error'
import { useRole } from '@/composables/useRole'
import { useCourseMemberCounts } from '@/composables/useCourseMemberCounts'
import { useI18n } from 'vue-i18n'
import Card from '@/components/ui/Card.vue'
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

const goToDetail = (courseId: string) => {
  router.push({ name: ROUTE_NAMES.coursesDetail, params: { id: courseId } })
}
</script>

<template>
  <div class="p-6">
    <PageHeader :title="$t('CoursesView.title')" :subtitle="$t('CoursesView.subtitle')">
      <template #actions>
        <BaseButton
            v-if="isStaff"
            @click="openCreateModal"
            class="flex items-center gap-2"
        >
          <Plus :size="16" />
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

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card
            v-for="course in courseStore.courses"
            :key="course.courseId"
            class="flex flex-col group h-full relative cursor-pointer hover:border-strong"
            @click="goToDetail(course.courseId)"
        >
          <!-- Delete action (top-right) -->
          <button
              v-if="isStaff"
              @click.stop="requestDelete(course)"
              class="absolute top-3 right-3 p-2 hover:bg-danger-dot/10 rounded-lg transition z-10"
              :title="$t('CoursesView.deleteTitle')"
          >
            <Trash2 :size="16" class="text-danger" />
          </button>

          <div class="flex items-center gap-4 mb-4">
            <div class="bg-line/[.04] p-3 rounded-lg text-fg-muted group-hover:text-accent-fg transition-colors flex items-center justify-center w-[56px] h-[56px] flex-shrink-0 border border-subtle">
              <GraduationCap :size="32" />
            </div>
            <h3 class="font-bold text-xl text-fg leading-tight pr-10">
              {{ course.name }}
            </h3>
          </div>

          <p class="text-fg-muted text-sm mb-6 flex-grow leading-relaxed text-left flex items-center gap-2">
            <template v-if="isStaff">
              <Users :size="14" class="text-icon" />
              <span>
                {{ memberCounts[course.courseId] ?? 0 }}
                {{ (memberCounts[course.courseId] ?? 0) === 1 ? $t('CoursesView.memberSingular') : $t('CoursesView.memberPlural') }}
              </span>
            </template>
            <span v-else class="text-fg-muted italic">
              {{ $t('CoursesView.openToView') }}
            </span>
          </p>

          <div class="mt-auto">
            <BaseButton
                variant="secondary"
                class="w-full flex items-center justify-center gap-2"
                @click.stop="goToDetail(course.courseId)"
            >
              {{ $t('CoursesView.openDetails') }}
            </BaseButton>
          </div>
        </Card>
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