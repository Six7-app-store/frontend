<script setup lang="ts">
import { ROUTE_NAMES } from '@/router/route-names'
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { UserMinus, UserPlus, Search, X, Loader2, Pencil, Check, X as CloseIcon } from 'lucide-vue-next'
import { useCourseStore } from '@/stores/course.store'
import { useToast } from '@/composables/useToast'
import { useUserSearch } from '@/composables/useUserSearch'
import { useBreadcrumbEntity } from '@/composables/useBreadcrumbs'
import { getErrorDetailMessage } from '@/utils/http-error'
import { useRole } from '@/composables/useRole'
import { roleLabelKey } from '@/i18n/role-labels'
import { useI18n } from 'vue-i18n'
import AlertBox from '@/components/ui/AlertBox.vue'
import Card from '@/components/ui/Card.vue'
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import Modal from '@/components/ui/Modal.vue'
import ConfirmModal from '@/components/ui/ConfirmModal.vue'
import type { User } from '@/types'

// ----------------------------------------------------------------
// Setup
// ----------------------------------------------------------------
const route = useRoute()
const router = useRouter()
const courseStore = useCourseStore()
const toast = useToast()
// Permission mirror: editing course name and managing members is the
// same staff-level capability the backend gates on course-teacher
// membership. We approximate with ``isStaff`` because the legacy view
// already did, and the API will still reject non-teachers.
const { isStaff } = useRole()
const { t } = useI18n()

const courseId = computed(() => String(route.params.id))
useBreadcrumbEntity(() => courseStore.currentCourse?.name)

// --- Kursname bearbeiten ---
const isEditingName = ref(false)
const editNameValue = ref('')

const startEditName = () => {
  editNameValue.value = courseStore.currentCourse?.name || ''
  isEditingName.value = true
}

const cancelEditName = () => {
  isEditingName.value = false
}

const saveName = async () => {
  if (!editNameValue.value || editNameValue.value === courseStore.currentCourse?.name) {
    isEditingName.value = false
    return
  }
  try {
    await courseStore.updateCourse(courseId.value, { name: editNameValue.value })
    toast.success(t('CourseDetailView.toasts.nameUpdated'))
    isEditingName.value = false
  } catch {
    toast.error(t('CourseDetailView.toasts.nameUpdateError'))
  }
}

// ----------------------------------------------------------------
// Modal States (Mitglieder)
// ----------------------------------------------------------------
const showAddModal = ref(false)
const {
  query: searchQuery, results: searchResults, isLoading: isSearching, loadInitial,
} = useUserSearch({ searchLimit: 10, initialLimit: 100 })
const selectedToAdd = ref<Map<string, User>>(new Map())
const isAddingMembers = ref(false)

const removingId = ref<string | null>(null)
const showRemoveModal = ref(false)
const memberToRemove = ref<User | null>(null)

// ----------------------------------------------------------------
// Loading
// ----------------------------------------------------------------
const loadCourse = async () => {
  try {
    await courseStore.fetchCourseById(courseId.value)
    if (courseStore.courses.length === 0) {
      await courseStore.fetchCourses()
    }
  } catch {
    toast.error(t('CourseDetailView.toasts.loadError'))
    router.push({ name: ROUTE_NAMES.courses })
  }
}

onMounted(loadCourse)
watch(courseId, loadCourse)

// ----------------------------------------------------------------
// User search & selection
// ----------------------------------------------------------------
// A failed search just shows no results; the user can retype.
const loadAvailableUsers = async () => {
  try {
    await loadInitial()
  } catch {
    searchResults.value = []
    toast.error(t('CourseDetailView.toasts.loadUsersError'))
  }
}

const isAlreadyMember = (userId: string) =>
    courseStore.currentMembers.some((m) => m.userId === userId)

const getOtherCourseName = (userCourseId: string | undefined | null) => {
  if (!userCourseId || userCourseId === courseId.value) return null
  const found = courseStore.courses.find(c => c.courseId === userCourseId)
  return found ? found.name : t('CourseDetailView.otherCourseFallback')
}

const toggleSelection = (user: User) => {
  if (selectedToAdd.value.has(user.userId)) {
    selectedToAdd.value.delete(user.userId)
  } else {
    selectedToAdd.value.set(user.userId, user)
  }
  selectedToAdd.value = new Map(selectedToAdd.value)
}

const removeSelection = (userId: string) => {
  selectedToAdd.value.delete(userId)
  selectedToAdd.value = new Map(selectedToAdd.value)
}

const openAddModal = () => {
  searchQuery.value = ''
  selectedToAdd.value = new Map()
  showAddModal.value = true
  loadAvailableUsers()
}

const closeAddModal = () => {
  showAddModal.value = false
}

const submitAddMembers = async () => {
  if (selectedToAdd.value.size === 0) return
  isAddingMembers.value = true
  try {
    const ids = Array.from(selectedToAdd.value.keys())
    await courseStore.addMembers(courseId.value, ids)

    // Singular/plural for toasts.
    if (ids.length === 1) {
      toast.success(t('CourseDetailView.toasts.membersAddedSingular'))
    } else {
      toast.success(t('CourseDetailView.toasts.membersAddedPlural', { count: ids.length }))
    }
    closeAddModal()
  } catch (err: any) {
    toast.error(getErrorDetailMessage(err) || t('CourseDetailView.toasts.addError'))
  } finally {
    isAddingMembers.value = false
  }
}

// ----------------------------------------------------------------
// Member removal
// ----------------------------------------------------------------
const requestRemoveMember = (user: User) => {
  memberToRemove.value = user
  showRemoveModal.value = true
}

const closeRemoveModal = () => {
  if (removingId.value) return
  showRemoveModal.value = false
  memberToRemove.value = null
}

const confirmRemoveMember = async () => {
  if (!memberToRemove.value) return
  const user = memberToRemove.value
  removingId.value = user.userId
  try {
    await courseStore.removeMember(courseId.value, user.userId)
    toast.success(t('CourseDetailView.toasts.memberRemoved'))
    showRemoveModal.value = false
    memberToRemove.value = null
  } catch (err: any) {
    toast.error(getErrorDetailMessage(err) || t('CourseDetailView.toasts.removeError'))
  } finally {
    removingId.value = null
  }
}

// ----------------------------------------------------------------
// Display helpers
// ----------------------------------------------------------------
const memberCount = computed(() => courseStore.currentMembers.length)

const roleLabel = (role: string | undefined) => {
  // Centralized role labels for consistent translations across views.
  return t(roleLabelKey(role))
}

// Members as in the design: the role is plain text, removing sits at the end of the row.
const memberColumns = computed<DataTableColumn[]>(() => [
  { id: 'name', label: t('CourseDetailView.columns.name') },
  { id: 'email', label: t('CourseDetailView.columns.email') },
  { id: 'role', label: t('CourseDetailView.columns.role'), class: 'w-[140px]' },
  ...(isStaff.value
    ? [{ id: 'actions', label: t('CourseDetailView.columns.actions'), class: 'w-16', align: 'right' as const, hideLabel: true }]
    : []),
])
</script>

<template>
  <div class="max-w-narrow">
    <div v-if="courseStore.isLoading && !courseStore.currentCourse" class="py-16 text-center text-fg-muted">
      {{ $t('CourseDetailView.loading') }}
    </div>

    <template v-else-if="courseStore.currentCourse">
      <div class="mb-section flex flex-col gap-1.5">
        <div v-if="!isEditingName" class="flex items-center gap-2">
          <h1 class="text-5xl font-semibold tracking-[-0.01em] text-heading">{{ courseStore.currentCourse.name }}</h1>
          <BaseButton
            v-if="isStaff"
            variant="ghost"
            icon
            :label="$t('CourseDetailView.editNameTitle')"
            :title="$t('CourseDetailView.editNameTitle')"
            @click="startEditName"
          >
            <Pencil :size="15" aria-hidden="true" />
          </BaseButton>
        </div>

        <div v-else class="flex max-w-md items-center gap-2">
          <BaseInput v-model="editNameValue" :aria-label="$t('CourseDetailView.editNameTitle')" @keyup.enter="saveName" auto-focus />
          <BaseButton icon :label="$t('CourseDetailView.save')" :title="$t('CourseDetailView.save')" @click="saveName">
            <Check :size="16" aria-hidden="true" />
          </BaseButton>
          <BaseButton variant="ghost" icon :label="$t('CourseDetailView.cancel')" :title="$t('CourseDetailView.cancel')" @click="cancelEditName">
            <CloseIcon :size="16" aria-hidden="true" />
          </BaseButton>
        </div>

        <p class="text-base text-fg-muted">
          {{ memberCount === 1 ? $t('CourseDetailView.memberSingular', { count: memberCount }) : $t('CourseDetailView.memberPlural', { count: memberCount }) }}
        </p>
      </div>

      <Card :title="$t('CourseDetailView.membersTitle')" flush>
        <template v-if="isStaff" #actions>
          <BaseButton @click="openAddModal">
            <UserPlus :size="16" aria-hidden="true" />
            {{ $t('CourseDetailView.addMemberBtn') }}
          </BaseButton>
        </template>

        <p v-if="courseStore.currentMembers.length === 0" class="px-panel py-10 text-center text-sm text-fg-muted">
          {{ $t('CourseDetailView.noMembers') }}
        </p>

        <DataTable
          v-else
          :columns="memberColumns"
          :rows="courseStore.currentMembers"
          :row-key="(u: User) => u.userId"
          :caption="$t('CourseDetailView.membersTitle')"
        >
          <template #cell-name="{ row }">
            <span class="flex items-center gap-3">
              <span class="avatar flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full text-xs font-semibold" aria-hidden="true">
                {{ (row.username || '?').charAt(0).toUpperCase() }}
              </span>
              <span class="truncate text-heading">{{ row.username }}</span>
            </span>
          </template>
          <template #cell-email="{ row }">
            <span class="text-fg-muted">{{ row.email }}</span>
          </template>
          <template #cell-role="{ row }">
            <span data-testid="member-role">{{ roleLabel(row.role) }}</span>
          </template>
          <template #cell-actions="{ row }">
            <!-- Removing is grey until hovered and always asks first. -->
            <BaseButton
              variant="danger"
              icon
              :label="$t('CourseDetailView.removeMemberTitle')"
              :title="$t('CourseDetailView.removeMemberTitle')"
              :disabled="removingId === row.userId"
              @click="requestRemoveMember(row)"
            >
              <Loader2 v-if="removingId === row.userId" :size="16" class="animate-spin" aria-hidden="true" />
              <UserMinus v-else :size="16" aria-hidden="true" />
            </BaseButton>
          </template>
        </DataTable>
      </Card>
    </template>

    <Modal :show="showAddModal" @close="closeAddModal">
      <template #header>
        <h2 class="text-xl font-semibold">{{ $t('CourseDetailView.addModal.title') }}</h2>
      </template>

      <template #body>
        <div class="space-y-5">

          <AlertBox tone="info">
            <p v-html="$t('CourseDetailView.addModal.info')"></p>
          </AlertBox>

          <div class="relative">
            <Search :size="16" class="absolute left-3 top-1/2 -translate-y-1/2 text-icon" />
            <input
                v-model="searchQuery"
                type="text"
                :placeholder="$t('CourseDetailView.addModal.searchPlaceholder')"
                class="field w-full pl-9 pr-3 py-2"
            />
          </div>

          <div v-if="selectedToAdd.size > 0" class="flex flex-wrap gap-2">
            <span
                v-for="user in Array.from(selectedToAdd.values())"
                :key="user.userId"
                class="flex items-center gap-1 bg-line/[.07] text-fg text-sm px-2 py-1 rounded"
            >
              {{ user.username }}
              <button @click="removeSelection(user.userId)" class="hover:text-heading">
                <X :size="14" />
              </button>
            </span>
          </div>

          <div class="max-h-64 overflow-y-auto border border-subtle rounded-lg overscroll-contain">
            <div v-if="isSearching" class="p-4 text-center text-fg-muted text-sm">
              {{ $t('CourseDetailView.addModal.loadingUsers') }}
            </div>
            <div
                v-else-if="searchResults.length === 0"
                class="p-4 text-center text-fg-muted text-sm"
            >
              {{ $t('CourseDetailView.addModal.noUsersFound') }}
            </div>
            <ul v-else class="divide-y">
              <label
                  v-for="user in searchResults"
                  :key="user.userId"
                  class="flex items-center justify-between p-3 hover:bg-line/[.04] transition select-none"
                  :class="isAlreadyMember(user.userId) ? 'opacity-75' : 'cursor-pointer'"
              >
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 rounded-full bg-line/[.07] flex items-center justify-center text-fg-muted text-xs font-semibold">
                    {{ (user.username || '?').charAt(0).toUpperCase() }}
                  </div>
                  <div>
                    <div class="font-medium text-fg text-sm">{{ user.username }}</div>
                    <div class="text-xs text-fg-muted">{{ user.email }}</div>
                  </div>
                </div>

                <div class="flex items-center gap-3">
                  <span v-if="isAlreadyMember(user.userId)" class="text-xs text-fg-muted">
                    {{ $t('CourseDetailView.addModal.alreadyMember') }}
                  </span>
                  <template v-else>
                    <span
                        v-if="getOtherCourseName(user.courseId)"
                        class="text-xs font-medium text-warning bg-warning-dot/10 px-2 py-1 rounded"
                    >
                      {{ $t('CourseDetailView.addModal.inOtherCourse', { courseName: getOtherCourseName(user.courseId) }) }}
                    </span>
                    <input
                        type="checkbox"
                        :checked="selectedToAdd.has(user.userId)"
                        @change="toggleSelection(user)"
                        class="w-4 h-4 text-fg-muted rounded border-strong cursor-pointer"
                    />
                  </template>
                </div>
              </label>
            </ul>
          </div>
        </div>
      </template>

      <template #footer>
        <div class="flex justify-end gap-3">
          <BaseButton variant="ghost" @click="closeAddModal" :disabled="isAddingMembers">
            {{ $t('CourseDetailView.addModal.cancel') }}
          </BaseButton>
          <BaseButton
              @click="submitAddMembers"
              :disabled="selectedToAdd.size === 0 || isAddingMembers"
          >
            {{ isAddingMembers ? $t('CourseDetailView.addModal.adding') : $t('CourseDetailView.addModal.addCount', { count: selectedToAdd.size }) }}
          </BaseButton>
        </div>
      </template>
    </Modal>

    <ConfirmModal
      :show="showRemoveModal"
      :busy="!!removingId"
      :title="$t('CourseDetailView.removeModal.title')"
      :confirm-label="$t('CourseDetailView.removeModal.remove')"
      :busy-label="$t('CourseDetailView.removeModal.removing')"
      @close="closeRemoveModal"
      @confirm="confirmRemoveMember"
    >
      <div class="space-y-3">
        <i18n-t keypath="CourseDetailView.removeModal.confirmPrompt" tag="p" class="text-fg">
          <template #username><strong>{{ memberToRemove?.username }}</strong></template>
        </i18n-t>
        <p class="text-sm text-fg-muted">
          {{ $t('CourseDetailView.removeModal.warning') }}
        </p>
      </div>
    </ConfirmModal>
  </div>
</template>