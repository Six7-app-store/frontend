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
import {
  ltiApi,
  type LtiContext,
  type LtiRosterImport,
  type LtiRosterSkipReason,
} from '@/api/lti.api'
import { courseApi } from '@/api/course.api'
import type { Course } from '@/types'
import {
  Loader2,
  GraduationCap,
  CheckCircle2,
  AlertCircle,
  DownloadCloud,
} from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()

type State =
  | 'loading'
  | 'ready'
  | 'saving'
  | 'saved'
  | 'importing'
  | 'imported'
  | 'error'

const state = ref<State>('loading')
const error = ref<string | null>(null)
const context = ref<LtiContext | null>(null)
const courses = ref<Course[]>([])
const selected = ref<string>('')
const report = ref<LtiRosterImport | null>(null)

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

/** Why a member was left alone, in words the lecturer can act on. */
const SKIP_LABELS: Record<LtiRosterSkipReason, string> = {
  no_subject: 'Moodle hat keine eindeutige Kennung mitgeschickt.',
  no_email: 'Keine E-Mail-Adresse im Moodle-Profil.',
  link_required:
    'Adresse gehört bereits zu einem Konto. Die Person meldet sich einmal direkt an, dann verknüpft sich der Moodle-Zugang selbst.',
  already_in_another_group:
    'Ist bereits in einer anderen Studiengruppe und bleibt dort.',
  instructor_not_trusted:
    'In Moodle Trainer:in — die Dozentenrolle im App Store vergibt eine Administration.',
}

function skipLabel(reason: LtiRosterSkipReason): string {
  return SKIP_LABELS[reason] ?? 'Konnte nicht übernommen werden.'
}

function describeImport(err: any): string {
  const code = err?.response?.data?.detail?.code
  if (code === 'lti_nrps_unavailable') {
    return 'Moodle gibt die Teilnehmerliste für diesen Kurs nicht heraus. In den Tool-Einstellungen „Kursmitglieder abrufen" aktivieren und die Aktivität einmal neu öffnen.'
  }
  if (code === 'lti_nrps_failed' || code === 'lti_nrps_unreachable') {
    return 'Die Teilnehmerliste konnte nicht von Moodle gelesen werden. Es wurde nichts angelegt.'
  }
  if (code === 'lti_context_already_mapped') {
    return 'Dieser Moodle-Kurs ist bereits einer Studiengruppe zugeordnet.'
  }
  if (err?.response?.status === 403) {
    return 'Dafür fehlen dir die Rechte. Anlegen kann eine Studiengruppe, wer als Dozent:in eingetragen ist.'
  }
  return 'Das Anlegen ist fehlgeschlagen. Es wurde nichts gespeichert.'
}

async function importFromMoodle() {
  if (!context.value) return

  state.value = 'importing'
  try {
    const { data } = await ltiApi.importContext(context.value.ltiContextId)
    report.value = data
    context.value = data.context
    state.value = 'imported'
  } catch (err) {
    console.error('Importing the Moodle roster failed:', err)
    error.value = describeImport(err)
    state.value = 'error'
  }
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

      <div v-else-if="state === 'importing'" class="flex flex-col items-center gap-4">
        <Loader2 class="animate-spin text-primary" :size="48" />
        <p class="text-gray-600">Teilnehmende werden aus Moodle geholt…</p>
      </div>

      <div
        v-else-if="state === 'imported' && report"
        data-testid="import-success"
        class="flex flex-col items-center gap-4 w-full"
      >
        <CheckCircle2 class="text-green-600" :size="48" />
        <div>
          <p class="font-semibold">
            Studiengruppe „{{ report.courseName }}" angelegt
          </p>
          <p class="text-sm text-gray-600 mt-2">
            {{ report.students }} Studierende, {{ report.teachers }} Dozierende
            übernommen — davon {{ report.created }} neu und
            {{ report.matched }} bereits bekannt.
          </p>
        </div>

        <div
          v-if="report.skipped.length"
          data-testid="import-skipped"
          class="w-full text-left rounded-md border border-amber-200 bg-amber-50 p-3"
        >
          <p class="text-sm font-medium text-amber-900">
            {{ report.skipped.length }} nicht übernommen
          </p>
          <ul class="mt-2 flex flex-col gap-2">
            <li
              v-for="(skip, i) in report.skipped"
              :key="i"
              class="text-xs text-amber-900"
            >
              <span class="font-medium">{{ skip.name || skip.email || 'Unbekannt' }}</span>
              — {{ skipLabel(skip.reason) }}
            </li>
          </ul>
        </div>

        <button
          class="px-4 py-2 rounded-md bg-primary text-white hover:opacity-90"
          @click="skip"
        >
          Weiter zu den Deployments
        </button>
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

        <!-- The other way round: no Studiengruppe to point at yet, so
             make it from what Moodle already knows about the course. -->
        <div class="w-full flex items-center gap-3 pt-2">
          <span class="h-px flex-1 bg-gray-200" />
          <span class="text-xs text-gray-400">oder</span>
          <span class="h-px flex-1 bg-gray-200" />
        </div>

        <button
          data-testid="map-import"
          :disabled="state === 'saving'"
          class="flex items-center gap-2 px-4 py-2 rounded-md border border-primary text-primary hover:bg-primary/5 disabled:opacity-50"
          @click="importFromMoodle"
        >
          <DownloadCloud :size="18" />
          Studiengruppe aus Moodle anlegen
        </button>
        <p class="text-xs text-gray-500 -mt-2">
          Legt „{{ moodleName }}" als neue Studiengruppe an und übernimmt die
          Teilnehmenden aus Moodle.
        </p>
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
