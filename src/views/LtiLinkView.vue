<script setup lang="ts">
/**
 * Where a refused Moodle launch lands.
 *
 * The backend refuses a launch whose Moodle identity is unknown while
 * its e-mail address already belongs to an account — the address is an
 * editable Moodle profile field, so it cannot be allowed to open a
 * foreign account. The way in is this page: sign in directly once, and
 * the Moodle account is attached to the account that login proves is
 * yours.
 *
 * The challenge travels through the sign-in in sessionStorage, because
 * that round trip leaves the page.
 */
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'
import { useLtiLink } from '@/composables/useLtiLink'
import { Loader2, Link2, CheckCircle2, AlertCircle } from 'lucide-vue-next'

const route = useRoute()
const authStore = useAuthStore()
const ltiLink = useLtiLink()

type State = 'working' | 'needs-login' | 'linked' | 'error'

const state = ref<State>('working')
const error = ref<string | null>(null)
const challenge = ref<string | null>(null)

const RELAUNCH_HINT = 'Bitte die Aktivität in Moodle erneut öffnen.'

function describe(err: any): string {
  const code = err?.response?.data?.detail?.code

  switch (code) {
    case 'lti_link_challenge_spent':
      return `Diese Verknüpfungs-Anfrage wurde bereits verwendet. ${RELAUNCH_HINT}`
    case 'lti_link_challenge_invalid':
      return `Die Verknüpfungs-Anfrage ist abgelaufen. ${RELAUNCH_HINT}`
    case 'lti_identity_taken':
      return 'Dieses Moodle-Konto ist bereits mit einem anderen Konto im App Store verknüpft.'
    case 'direct_login_required':
      return 'Für diesen Schritt ist eine direkte Anmeldung nötig — eine aus Moodle gestartete Sitzung reicht nicht.'
    default:
      return `Die Verknüpfung ist fehlgeschlagen. ${RELAUNCH_HINT}`
  }
}

/** Whether a failed attempt leaves the challenge worth keeping. */
function isSpent(err: any): boolean {
  const code = err?.response?.data?.detail?.code
  return (
    code === 'lti_link_challenge_spent' ||
    code === 'lti_link_challenge_invalid' ||
    code === 'lti_identity_taken'
  )
}

async function link(value: string) {
  state.value = 'working'
  try {
    await ltiLink.submit(value)
    ltiLink.forget()
    state.value = 'linked'
  } catch (err) {
    console.error('LTI link failed:', err)
    if (isSpent(err)) {
      ltiLink.forget()
    }
    error.value = describe(err)
    state.value = 'error'
  }
}

function signIn() {
  // Comes back to this route, where the stored challenge is waiting.
  authStore.login('/lti/link')
}

onMounted(async () => {
  const fromUrl = typeof route.query.challenge === 'string' ? route.query.challenge : null
  const value = fromUrl ?? ltiLink.pending()

  if (!value) {
    error.value = `Es liegt keine offene Verknüpfung vor. ${RELAUNCH_HINT}`
    state.value = 'error'
    return
  }

  challenge.value = value
  ltiLink.remember(value)
  if (fromUrl) {
    // Out of the address bar, the back-stack and anything the user
    // might copy — the same reason the session token does not stay
    // in the URL either.
    window.history.replaceState({}, '', '/lti/link')
  }

  // A launched session cannot authorise the link: it is derived from
  // the very claim being checked. Only a direct login counts.
  if (!authStore.isAuthenticated || authStore.isLtiSession) {
    state.value = 'needs-login'
    return
  }

  await link(value)
})
</script>

<template>
  <div class="flex flex-col items-center justify-center min-h-screen px-4">
    <div class="max-w-md w-full text-center flex flex-col items-center gap-4">
      <div v-if="state === 'working'" class="flex flex-col items-center gap-4">
        <Loader2 class="animate-spin text-primary" :size="48" />
        <p class="text-gray-600">Moodle-Konto wird verknüpft…</p>
      </div>

      <div v-else-if="state === 'needs-login'" class="flex flex-col items-center gap-4">
        <Link2 class="text-primary" :size="48" />
        <div>
          <p class="font-semibold">Konto bestätigen</p>
          <p class="text-sm text-gray-600 mt-2">
            Diese E-Mail-Adresse gehört bereits zu einem Konto im App Store.
            Melde dich einmal direkt an — danach ist dein Moodle-Zugang mit
            diesem Konto verknüpft und der Start aus Moodle funktioniert
            ohne weitere Schritte.
          </p>
        </div>
        <button
          data-testid="link-login"
          class="px-4 py-2 rounded-md bg-primary text-white hover:opacity-90"
          @click="signIn"
        >
          Jetzt anmelden und verknüpfen
        </button>
      </div>

      <div
        v-else-if="state === 'linked'"
        data-testid="link-success"
        class="flex flex-col items-center gap-4"
      >
        <CheckCircle2 class="text-green-600" :size="48" />
        <div>
          <p class="font-semibold">Moodle-Konto verknüpft</p>
          <p class="text-sm text-gray-600 mt-2">
            Ab jetzt meldet dich der Start aus Moodle direkt an.
            {{ RELAUNCH_HINT }}
          </p>
        </div>
      </div>

      <div
        v-else
        data-testid="link-error"
        class="flex flex-col items-center gap-4 text-red-500"
      >
        <AlertCircle :size="48" />
        <div>
          <p class="font-semibold">Verknüpfung nicht möglich</p>
          <p class="text-sm mt-2">{{ error }}</p>
        </div>
      </div>
    </div>
  </div>
</template>
