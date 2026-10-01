import { onScopeDispose, ref, watch } from 'vue'
import { userApi } from '@/api/user.api'
import type { User } from '@/types'

export const USER_SEARCH_DEBOUNCE_MS = 300
export const USER_SEARCH_MIN_LENGTH = 2

/**
 * A person search as the course page and the deployment wizard use it: an
 * initial list of students, replaced by the backend's search results while
 * ``query`` holds at least two characters. Typing is debounced; a shorter
 * query keeps the current list so it doesn't flicker, an empty one shows the
 * initial list again.
 *
 * A failed search empties the results and sets ``error`` until the next
 * query; a failed initial load is thrown to the caller of ``loadInitial``.
 */
export function useUserSearch(options: { searchLimit: number; initialLimit: number }) {
  const query = ref('')
  const results = ref<User[]>([])
  const isLoading = ref(false)
  const error = ref<unknown>(null)
  let initial: User[] = []
  let timer: ReturnType<typeof setTimeout> | undefined

  async function loadInitial() {
    isLoading.value = true
    try {
      const { data } = await userApi.list({ role: 'student', limit: options.initialLimit })
      initial = data || []
      if (!query.value.trim()) results.value = initial
      return initial
    } finally {
      isLoading.value = false
    }
  }

  async function search(q: string) {
    isLoading.value = true
    try {
      const { data } = await userApi.search(q, options.searchLimit)
      results.value = data || []
      error.value = null
    } catch (err) {
      results.value = []
      error.value = err
    } finally {
      isLoading.value = false
    }
  }

  watch(query, (value) => {
    clearTimeout(timer)
    const q = value?.trim() || ''
    if (!q) {
      results.value = initial
      error.value = null
      return
    }
    if (q.length < USER_SEARCH_MIN_LENGTH) {
      error.value = null
      return
    }
    timer = setTimeout(() => search(q), USER_SEARCH_DEBOUNCE_MS)
  })

  onScopeDispose(() => clearTimeout(timer))

  return { query, results, isLoading, error, loadInitial }
}
