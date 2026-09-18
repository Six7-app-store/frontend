<script setup lang="ts">
/**
 * Landing point of a Moodle LTI launch.
 *
 * The backend finishes the launch with a redirect to this route,
 * carrying the session token in the query string. It travels in the URL
 * rather than a cookie because the launch is a cross-site POST landing
 * in a fresh browsing context — a cookie set there is a third-party
 * cookie and gets dropped in exactly the framed case this has to work
 * in.
 *
 * The token is taken out of the URL and the history entry is replaced,
 * so it does not sit in the address bar, in the back-stack, or in a
 * link the user might copy.
 *
 * Alongside the token the backend says where this launch should land —
 * a student clicking a Moodle activity wants their environment, not a
 * dashboard they then have to navigate out of.
 */
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'
import { useLtiSession } from '@/composables/useLtiSession'
import { Loader2 } from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const ltiSession = useLtiSession()

const error = ref<string | null>(null)

const FALLBACK_TARGET = '/dashboard'

/**
 * Accept the landing path only if it is one of ours.
 *
 * The value arrives through the address bar, so a crafted launch URL
 * must not be able to turn this redirect into a trip to another site.
 * Anything that is not a plain in-app path is dropped in favour of the
 * dashboard — landing a page too early is a nuisance, an open redirect
 * is a phishing tool.
 */
function safeTarget(raw: unknown): string {
  if (typeof raw !== 'string' || !raw.startsWith('/')) return FALLBACK_TARGET
  // ``//host`` and ``/\host`` are protocol-relative: a browser reads
  // both as a different origin.
  if (raw.startsWith('//') || raw.startsWith('/\\')) return FALLBACK_TARGET
  return raw
}

onMounted(async () => {
  const token = typeof route.query.token === 'string' ? route.query.token : null
  const target = safeTarget(route.query.target)

  if (!token) {
    error.value = 'Kein Sitzungstoken übergeben. Bitte die Aktivität in Moodle erneut öffnen.'
    return
  }

  ltiSession.setToken(token)
  window.history.replaceState({}, '', '/lti/callback')

  try {
    await authStore.fetchMe()
    router.replace(target)
  } catch (err) {
    console.error('LTI callback failed:', err)
    ltiSession.clear()
    error.value = 'Die Anmeldung konnte nicht abgeschlossen werden. Bitte die Aktivität in Moodle erneut öffnen.'
  }
})
</script>

<template>
  <div class="flex flex-col items-center justify-center min-h-screen">
    <div class="text-center">
      <div v-if="!error" class="flex flex-col items-center gap-4">
        <Loader2 class="animate-spin text-primary" :size="48" />
        <p class="text-gray-600">Anmeldung über Moodle wird abgeschlossen…</p>
      </div>

      <div v-else class="flex flex-col items-center gap-4">
        <div class="text-red-500">
          <p class="font-semibold">Anmeldung fehlgeschlagen</p>
          <p class="text-sm mt-2">{{ error }}</p>
        </div>
      </div>
    </div>
  </div>
</template>
