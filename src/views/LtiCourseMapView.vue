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
import type { LtiRosterSkipReason } from '@/api/lti.api'
import { useLtiCourseMapping } from '@/composables/useLtiCourseMapping'
import { getErrorCode, getErrorStatus } from '@/utils/http-error'
import BaseButton from '@/components/ui/BaseButton.vue'
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
const { context, courses, report, load, map, importRoster } = useLtiCourseMapping()
const selected = ref<string>('')

/** What Moodle calls this course, with the short label as a fallback. */
const moodleName = computed(
  () => context.value?.title || context.value?.label || context.value?.context_id || ''
)

function describe(err: unknown): string {
  const status = getErrorStatus(err)
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

function describeImport(err: unknown): string {
  const code = getErrorCode(err)
  if (code === 'lti_nrps_unavailable') {
    return 'Moodle gibt die Teilnehmerliste für diesen Kurs nicht heraus. In den Tool-Einstellungen „Kursmitglieder abrufen" aktivieren und die Aktivität einmal neu öffnen.'
  }
  if (code === 'lti_nrps_failed' || code === 'lti_nrps_unreachable') {
    return 'Die Teilnehmerliste konnte nicht von Moodle gelesen werden. Es wurde nichts angelegt.'
  }
  if (code === 'lti_context_already_mapped') {
    return 'Dieser Moodle-Kurs ist bereits einer Studiengruppe zugeordnet.'
  }
  if (getErrorStatus(err) === 403) {
    return 'Dafür fehlen dir die Rechte. Anlegen kann eine Studiengruppe, wer als Dozent:in eingetragen ist.'
  }
  return 'Das Anlegen ist fehlgeschlagen. Es wurde nichts gespeichert.'
}

async function importFromMoodle() {
  if (!context.value) return

  state.value = 'importing'
  try {
    await importRoster()
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
    await map(selected.value)
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
    await load(ltiContextId)
    selected.value = context.value?.courseId ?? ''
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
        <Loader2 class="animate-spin text-icon" :size="48" />
        <p class="text-fg-muted">Moodle-Kurs wird geladen…</p>
      </div>

      <div v-else-if="state === 'importing'" class="flex flex-col items-center gap-4">
        <Loader2 class="animate-spin text-icon" :size="48" />
        <p class="text-fg-muted">Teilnehmende werden aus Moodle geholt…</p>
      </div>

      <div
        v-else-if="state === 'imported' && report"
        data-testid="import-success"
        class="flex flex-col items-center gap-4 w-full"
      >
        <CheckCircle2 class="text-success" :size="48" />
        <div>
          <p class="font-semibold">
            Studiengruppe „{{ report.courseName }}" angelegt
          </p>
          <p class="text-sm text-fg-muted mt-2">
            {{ report.students }} Studierende, {{ report.teachers }} Dozierende
            übernommen — davon {{ report.created }} neu und
            {{ report.matched }} bereits bekannt.
          </p>
        </div>

        <div
          v-if="report.skipped.length"
          data-testid="import-skipped"
          class="w-full text-left rounded-md border border-warning-dot/30 bg-warning-dot/10 p-3"
        >
          <p class="text-sm font-medium text-warning">
            {{ report.skipped.length }} nicht übernommen
          </p>
          <ul class="mt-2 flex flex-col gap-2">
            <li
              v-for="(skip, i) in report.skipped"
              :key="i"
              class="text-xs text-warning"
            >
              <span class="font-medium">{{ skip.name || skip.email || 'Unbekannt' }}</span>
              — {{ skipLabel(skip.reason) }}
            </li>
          </ul>
        </div>

        <BaseButton size="sm" @click="skip">
          Weiter zu den Deployments
        </BaseButton>
      </div>

      <div
        v-else-if="state === 'ready' || state === 'saving'"
        data-testid="map-form"
        class="flex flex-col items-center gap-4 w-full"
      >
        <GraduationCap class="text-icon" :size="48" />
        <div>
          <p class="font-semibold">Moodle-Kurs zuordnen</p>
          <p class="text-sm text-fg-muted mt-2">
            Du hast diese Aktivität aus
            <strong>{{ moodleName }}</strong>
            gestartet. Welche Studiengruppe ist das?
          </p>
          <p class="text-xs text-fg-muted mt-2">
            Die Zuordnung sorgt dafür, dass Studierende beim Klick in Moodle
            direkt in ihrer Umgebung landen statt in einer Liste.
          </p>
        </div>

        <select
          v-model="selected"
          data-testid="map-course"
          :disabled="state === 'saving'"
          class="field w-full px-3 py-2"
        >
          <option value="" disabled>Studiengruppe wählen…</option>
          <option v-for="course in courses" :key="course.courseId" :value="course.courseId">
            {{ course.name }}
          </option>
        </select>

        <div class="flex items-center gap-3">
          <BaseButton
            data-testid="map-submit"
            size="sm"
            :disabled="!selected || state === 'saving'"
            @click="save"
          >
            Zuordnen
          </BaseButton>
          <button
            data-testid="map-skip"
            class="px-4 py-2 rounded-md text-fg-muted hover:text-fg"
            @click="skip"
          >
            Später
          </button>
        </div>

        <!-- The other way round: no Studiengruppe to point at yet, so
             make it from what Moodle already knows about the course. -->
        <div class="w-full flex items-center gap-3 pt-2">
          <span class="h-px flex-1 bg-line/[.12]" />
          <span class="text-xs text-fg-muted">oder</span>
          <span class="h-px flex-1 bg-line/[.12]" />
        </div>

        <BaseButton
          data-testid="map-import"
          variant="secondary"
          size="sm"
          :disabled="state === 'saving'"
          @click="importFromMoodle"
        >
          <DownloadCloud :size="18" />
          Studiengruppe aus Moodle anlegen
        </BaseButton>
        <p class="text-xs text-fg-muted -mt-2">
          Legt „{{ moodleName }}" als neue Studiengruppe an und übernimmt die
          Teilnehmenden aus Moodle.
        </p>
      </div>

      <div
        v-else-if="state === 'saved'"
        data-testid="map-success"
        class="flex flex-col items-center gap-4"
      >
        <CheckCircle2 class="text-success" :size="48" />
        <div>
          <p class="font-semibold">Zugeordnet</p>
          <p class="text-sm text-fg-muted mt-2">
            Studierende, die diese Aktivität in Moodle öffnen, landen ab jetzt
            direkt in ihrer Umgebung.
          </p>
        </div>
        <BaseButton size="sm" @click="skip">
          Weiter zu den Deployments
        </BaseButton>
      </div>

      <div
        v-else
        data-testid="map-error"
        class="flex flex-col items-center gap-4 text-danger"
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
