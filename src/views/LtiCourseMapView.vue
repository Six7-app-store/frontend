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
import { useI18n } from 'vue-i18n'
import { ROUTE_NAMES } from '@/router/route-names'
import type { LtiRosterSkipReason } from '@/api/lti.api'
import { useLtiCourseMapping } from '@/composables/useLtiCourseMapping'
import { getErrorCode, getErrorStatus } from '@/utils/http-error'
import AlertBox from '@/components/ui/AlertBox.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import StatusPage from '@/components/ui/StatusPage.vue'
import StatusScreen from '@/components/ui/StatusScreen.vue'
import {
  GraduationCap,
  CheckCircle2,
  AlertCircle,
  DownloadCloud,
} from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()

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
  if (status === 403) return t('lti.courseMap.errors.forbidden')
  if (status === 404) return t('lti.courseMap.errors.notFound')
  return t('lti.courseMap.errors.generic')
}

const SKIP_REASONS: readonly LtiRosterSkipReason[] = [
  'no_subject', 'no_email', 'link_required', 'already_in_another_group', 'instructor_not_trusted',
]

/** Why a member was left alone, in words the lecturer can act on. */
function skipLabel(reason: LtiRosterSkipReason): string {
  return t(`lti.courseMap.skipReasons.${SKIP_REASONS.includes(reason) ? reason : 'other'}`)
}

function describeImport(err: unknown): string {
  const code = getErrorCode(err)
  if (code === 'lti_nrps_unavailable') return t('lti.courseMap.importErrors.nrpsUnavailable')
  if (code === 'lti_nrps_failed' || code === 'lti_nrps_unreachable') {
    return t('lti.courseMap.importErrors.nrpsFailed')
  }
  if (code === 'lti_context_already_mapped') return t('lti.courseMap.importErrors.alreadyMapped')
  if (getErrorStatus(err) === 403) return t('lti.courseMap.importErrors.forbidden')
  return t('lti.courseMap.importErrors.generic')
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
  router.replace({ name: ROUTE_NAMES.deploymentsList })
}

onMounted(async () => {
  const ltiContextId =
    typeof route.query.context === 'string' ? route.query.context : null

  if (!ltiContextId) {
    error.value = t('lti.courseMap.errors.noContext')
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
  <StatusPage>
    <StatusScreen v-if="state === 'loading'" loading :text="$t('lti.courseMap.loading')" />
    <StatusScreen v-else-if="state === 'importing'" loading :text="$t('lti.courseMap.importing')" />

    <StatusScreen
      v-else-if="state === 'imported' && report"
      data-testid="import-success"
      :icon="CheckCircle2"
      tone="success"
      :title="$t('lti.courseMap.importedTitle', { name: report.courseName })"
      :text="$t('lti.courseMap.importedText', {
        students: report.students, teachers: report.teachers,
        created: report.created, matched: report.matched,
      })"
    >
      <AlertBox
        v-if="report.skipped.length"
        data-testid="import-skipped"
        class="w-full"
        :title="$t('lti.courseMap.skippedCount', { count: report.skipped.length })"
      >
        <ul class="mt-2 flex flex-col gap-2">
          <li v-for="(skip, i) in report.skipped" :key="i" class="text-sm">
            <span class="font-semibold">{{ skip.name || skip.email || $t('lti.courseMap.unknownPerson') }}</span>
            — {{ skipLabel(skip.reason) }}
          </li>
        </ul>
      </AlertBox>

      <BaseButton size="sm" @click="skip">
        {{ $t('lti.courseMap.toDeployments') }}
      </BaseButton>
    </StatusScreen>

    <StatusScreen
      v-else-if="state === 'ready' || state === 'saving'"
      data-testid="map-form"
      :icon="GraduationCap"
      :title="$t('lti.courseMap.title')"
    >
      <template #text>
        <i18n-t keypath="lti.courseMap.startedFrom" tag="p" class="text-md text-fg-muted">
          <template #name><strong>{{ moodleName }}</strong></template>
        </i18n-t>
        <p class="text-sm text-fg-muted">{{ $t('lti.courseMap.mappingHint') }}</p>
      </template>

      <select
        v-model="selected"
        data-testid="map-course"
        :disabled="state === 'saving'"
        class="field w-full px-3 py-2"
      >
        <option value="" disabled>{{ $t('lti.courseMap.chooseCourse') }}</option>
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
          {{ $t('lti.courseMap.map') }}
        </BaseButton>
        <BaseButton data-testid="map-skip" variant="ghost" size="sm" @click="skip">
          {{ $t('lti.courseMap.later') }}
        </BaseButton>
      </div>

      <!-- The other way round: no Studiengruppe to point at yet, so
           make it from what Moodle already knows about the course. -->
      <div class="w-full flex items-center gap-3 pt-2">
        <span class="h-px flex-1 bg-line/[.12]" />
        <span class="text-xs text-fg-muted">{{ $t('lti.courseMap.or') }}</span>
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
        {{ $t('lti.courseMap.import') }}
      </BaseButton>
      <p class="text-xs text-fg-muted -mt-2">
        {{ $t('lti.courseMap.importHint', { name: moodleName }) }}
      </p>
    </StatusScreen>

    <StatusScreen
      v-else-if="state === 'saved'"
      data-testid="map-success"
      :icon="CheckCircle2"
      tone="success"
      :title="$t('lti.courseMap.savedTitle')"
      :text="$t('lti.courseMap.savedText')"
    >
      <BaseButton size="sm" @click="skip">
        {{ $t('lti.courseMap.toDeployments') }}
      </BaseButton>
    </StatusScreen>

    <StatusScreen
      v-else
      data-testid="map-error"
      :icon="AlertCircle"
      tone="danger"
      :title="$t('lti.courseMap.errorTitle')"
      :text="error ?? ''"
    />
  </StatusPage>
</template>
