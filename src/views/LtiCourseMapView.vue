<script setup lang="ts">
/**
 * Where a lecturer's launch from an unmapped Moodle course lands.
 *
 * A launch records which Moodle course it came from, but the backend
 * deliberately leaves the mapping empty: a Moodle course and a
 * Studiengruppe are different things, and guessing an equivalence would
 * quietly attach people to the wrong group. Somebody who teaches the
 * course has to say so, and this is where they do it.
 *
 * The mapping is what lets a student launch open one environment
 * instead of a list. It is a narrowing hint, never an access grant —
 * every environment a student then reaches still passes the same
 * membership checks as through the normal UI.
 *
 * The page is reached straight from a launch, so it has to work on an
 * LTI session and must not assume the lecturer can reach anything else
 * in the app first.
 */
import { onMounted, ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ltiApi, type LtiContext } from '@/api/lti.api'
import { courseApi } from '@/api/course.api'
import type { Course } from '@/types'
import { Loader2, GraduationCap, CheckCircle2, AlertCircle } from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()

type State = 'loading' | 'ready' | 'saving' | 'saved' | 'error'

const state = ref<State>('loading')
const error = ref<string | null>(null)
const context = ref<LtiContext | null>(null)
const courses = ref<Course[]>([])
const selected = ref<string>('')

/** What Moodle calls this course, with the short label as a fallback. */
const moodleName = computed(
  () => context.value?.title || context.value?.label || context.value?.context_id || ''
)

function describe(err: any): string {
  const status = err?.response?.status
  if (status === 403) {
    return 'Für diese Studiengruppe fehlen dir die Rechte. Zuordnen kann sie, wer als Dozent:in dafür eingetragen ist.'
  }
  if (status === 404) {
    return 'Der Moodle-Kurs oder die Studiengruppe ist nicht mehr vorhanden.'
  }
  return 'Die Zuordnung ist fehlgeschlagen. Bitte die Aktivität in Moodle erneut öffnen.'
}

async function save() {
  if (!context.value || !selected.value) return

  state.value = 'saving'
  try {
    const { data } = await ltiApi.mapContext(context.value.ltiContextId, selected.value)
    context.value = data
    state.value = 'saved'
  } catch (err) {
    console.error('Mapping the Moodle course failed:', err)
    error.value = describe(err)
    state.value = 'error'
  }
}

function skip() {
  // Skipping is a valid answer. Without a mapping a student launch
  // still works, it just lands on the list instead of one environment.
  router.replace('/deployments')
}

onMounted(async () => {
  const ltiContextId =
    typeof route.query.context === 'string' ? route.query.context : null

  if (!ltiContextId) {
    error.value = 'Es wurde kein Moodle-Kurs übergeben. Bitte die Aktivität in Moodle erneut öffnen.'
    state.value = 'error'
    return
  }

  try {
    // Both are needed before anything can be shown, and neither depends
    // on the other.
    const [ctxResp, courseResp] = await Promise.all([
      ltiApi.getContext(ltiContextId),
      courseApi.list(),
    ])
    context.value = ctxResp.data
    courses.value = courseResp.data
    selected.value = ctxResp.data.courseId ?? ''
    state.value = 'ready'
  } catch (err) {
    console.error('Loading the Moodle course failed:', err)
    error.value = describe(err)
    state.value = 'error'
  }
})
</script>

<template>
  <div class="flex flex-col items-center justify-center min-h-screen px-4">
    <div class="max-w-md w-full text-center flex flex-col items-center gap-4">
      <div v-if="state === 'loading'" class="flex flex-col items-center gap-4">
        <Loader2 class="animate-spin text-primary" :size="48" />
        <p class="text-gray-600">Moodle-Kurs wird geladen…</p>
      </div>

      <div
        v-else-if="state === 'ready' || state === 'saving'"
        data-testid="map-form"
        class="flex flex-col items-center gap-4 w-full"
      >
        <GraduationCap class="text-primary" :size="48" />
        <div>
          <p class="font-semibold">Moodle-Kurs zuordnen</p>
          <p class="text-sm text-gray-600 mt-2">
            Du hast diese Aktivität aus
            <strong>{{ moodleName }}</strong>
            gestartet. Welche Studiengruppe ist das?
          </p>
          <p class="text-xs text-gray-500 mt-2">
            Die Zuordnung sorgt dafür, dass Studierende beim Klick in Moodle
            direkt in ihrer Umgebung landen statt in einer Liste.
          </p>
        </div>

        <select
          v-model="selected"
          data-testid="map-course"
          :disabled="state === 'saving'"
          class="w-full px-3 py-2 rounded-md border border-gray-300 bg-white"
        >
          <option value="" disabled>Studiengruppe wählen…</option>
          <option v-for="course in courses" :key="course.courseId" :value="course.courseId">
            {{ course.name }}
          </option>
        </select>

        <div class="flex items-center gap-3">
          <button
            data-testid="map-submit"
            :disabled="!selected || state === 'saving'"
            class="px-4 py-2 rounded-md bg-primary text-white hover:opacity-90 disabled:opacity-50"
            @click="save"
          >
            Zuordnen
          </button>
          <button
            data-testid="map-skip"
            class="px-4 py-2 rounded-md text-gray-600 hover:text-gray-900"
            @click="skip"
          >
            Später
          </button>
        </div>
      </div>

      <div
        v-else-if="state === 'saved'"
        data-testid="map-success"
        class="flex flex-col items-center gap-4"
      >
        <CheckCircle2 class="text-green-600" :size="48" />
        <div>
          <p class="font-semibold">Zugeordnet</p>
          <p class="text-sm text-gray-600 mt-2">
            Studierende, die diese Aktivität in Moodle öffnen, landen ab jetzt
            direkt in ihrer Umgebung.
          </p>
        </div>
        <button
          class="px-4 py-2 rounded-md bg-primary text-white hover:opacity-90"
          @click="skip"
        >
          Weiter zu den Deployments
        </button>
      </div>

      <div
        v-else
        data-testid="map-error"
        class="flex flex-col items-center gap-4 text-red-500"
      >
        <AlertCircle :size="48" />
        <div>
          <p class="font-semibold">Zuordnung nicht möglich</p>
          <p class="text-sm mt-2">{{ error }}</p>
        </div>
      </div>
    </div>
  </div>
</template>
