<script setup lang="ts">
/**
 * Where a deep-linking request from Moodle lands.
 *
 * Moodle is not opening the tool here — it is asking what the activity
 * being created should point at. The lecturer picks an app, and the
 * signed answer goes back to Moodle, which then creates the activity
 * bound to that choice.
 *
 * **It binds to an app, not to one environment.** Which environment a
 * student opens is resolved per person at launch time, from the
 * deployments they are a member of. That way the same activity works
 * whether a course shares one environment or everybody has their own,
 * and it keeps working after an environment is torn down and rebuilt.
 *
 * The answer is posted from *this page* rather than by the backend:
 * ``returnUrl`` is a Moodle URL that authenticates the lecturer's
 * Moodle session, and only their browser carries it. The backend only
 * signs.
 */
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { ltiApi } from '@/api/lti.api'
import { appApi } from '@/api/app.api'
import type { App } from '@/types'
import { Loader2, Link2, AlertCircle } from 'lucide-vue-next'

const route = useRoute()

type State = 'loading' | 'ready' | 'sending' | 'error'

const state = ref<State>('loading')
const error = ref<string | null>(null)
const apps = ref<App[]>([])
const handle = ref<string | null>(null)
const selected = ref<string>('')

function describe(err: any): string {
  const code = err?.response?.data?.detail?.code
  if (code === 'lti_deep_link_expired') {
    return 'Diese Auswahl ist nicht mehr offen. Lege die Aktivität in Moodle noch einmal an.'
  }
  if (code === 'lti_deep_link_foreign') {
    return 'Diese Auswahl gehört zu einem anderen Konto.'
  }
  if (err?.response?.status === 403) {
    return 'Dafür fehlen dir die Rechte.'
  }
  if (err?.response?.status === 404) {
    return 'Diese App gibt es nicht mehr.'
  }
  return 'Die Auswahl konnte nicht an Moodle übergeben werden.'
}

/**
 * Hand the signed answer to Moodle.
 *
 * Built and submitted as a real form because that is the only shape the
 * platform accepts — a redirect or a fetch would not carry it, and the
 * navigation has to come from the browser so Moodle sees its own
 * session.
 */
function postToMoodle(returnUrl: string, jwt: string) {
  const form = document.createElement('form')
  form.method = 'POST'
  form.action = returnUrl
  const field = document.createElement('input')
  field.type = 'hidden'
  field.name = 'JWT'
  field.value = jwt
  form.appendChild(field)
  document.body.appendChild(form)
  form.submit()
}

async function choose() {
  if (!handle.value || !selected.value) return

  state.value = 'sending'
  try {
    const { data } = await ltiApi.selectDeepLink(handle.value, selected.value)
    postToMoodle(data.returnUrl, data.jwt)
  } catch (err) {
    console.error('Deep link selection failed:', err)
    error.value = describe(err)
    state.value = 'error'
  }
}

onMounted(async () => {
  handle.value = typeof route.query.dl === 'string' ? route.query.dl : null

  if (!handle.value) {
    error.value = 'Es wurde keine Moodle-Anfrage übergeben. Lege die Aktivität in Moodle erneut an.'
    state.value = 'error'
    return
  }

  try {
    const { data } = await appApi.list()
    apps.value = data
    state.value = 'ready'
  } catch (err) {
    console.error('Loading apps for the deep link failed:', err)
    error.value = 'Die Apps konnten nicht geladen werden.'
    state.value = 'error'
  }
})
</script>

<template>
  <div class="flex flex-col items-center justify-center min-h-screen px-4">
    <div class="max-w-md w-full text-center flex flex-col items-center gap-4">
      <div v-if="state === 'loading'" class="flex flex-col items-center gap-4">
        <Loader2 class="animate-spin text-primary" :size="48" />
        <p class="text-gray-600">Apps werden geladen…</p>
      </div>

      <div v-else-if="state === 'sending'" class="flex flex-col items-center gap-4">
        <Loader2 class="animate-spin text-primary" :size="48" />
        <p class="text-gray-600">Auswahl wird an Moodle übergeben…</p>
      </div>

      <div
        v-else-if="state === 'ready'"
        data-testid="deeplink-form"
        class="flex flex-col items-center gap-4 w-full"
      >
        <Link2 class="text-primary" :size="48" />
        <div>
          <p class="font-semibold">Welche App soll diese Aktivität öffnen?</p>
          <p class="text-sm text-gray-600 mt-2">
            Studierende landen beim Klick direkt in ihrer Umgebung dieser App —
            ohne Umweg über eine Liste.
          </p>
        </div>

        <div v-if="apps.length === 0" data-testid="deeplink-empty" class="text-sm text-gray-600">
          Es gibt noch keine Apps, auf die diese Aktivität zeigen könnte.
        </div>

        <select
          v-else
          v-model="selected"
          data-testid="deeplink-app"
          class="w-full px-3 py-2 rounded-md border border-gray-300 bg-white"
        >
          <option value="" disabled>App wählen…</option>
          <option v-for="app in apps" :key="app.appId" :value="app.appId">
            {{ app.name }}
          </option>
        </select>

        <button
          data-testid="deeplink-submit"
          :disabled="!selected"
          class="px-4 py-2 rounded-md bg-primary text-white hover:opacity-90 disabled:opacity-50"
          @click="choose"
        >
          Übernehmen
        </button>

        <p class="text-xs text-gray-500">
          Die Zuordnung steckt danach in der Moodle-Aktivität. Welche Umgebung
          jemand öffnet, wird bei jedem Klick neu bestimmt.
        </p>
      </div>

      <div
        v-else
        data-testid="deeplink-error"
        class="flex flex-col items-center gap-4 text-red-500"
      >
        <AlertCircle :size="48" />
        <div>
          <p class="font-semibold">Auswahl nicht möglich</p>
          <p class="text-sm mt-2">{{ error }}</p>
        </div>
      </div>
    </div>
  </div>
</template>
