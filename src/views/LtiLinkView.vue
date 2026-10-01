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
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth.store'
import { useLtiLink } from '@/composables/useLtiLink'
import { getErrorCode } from '@/utils/http-error'
import BaseButton from '@/components/ui/BaseButton.vue'
import StatusPage from '@/components/ui/StatusPage.vue'
import StatusScreen from '@/components/ui/StatusScreen.vue'
import { Link2, CheckCircle2, AlertCircle } from 'lucide-vue-next'

const route = useRoute()
const { t } = useI18n()
const authStore = useAuthStore()
const ltiLink = useLtiLink()

type State = 'working' | 'needs-login' | 'linked' | 'error'

const state = ref<State>('working')
const error = ref<string | null>(null)
const challenge = ref<string | null>(null)

/** ``key``'s text followed by the hint to relaunch from Moodle. */
const withRelaunch = (key: string) => `${t(key)} ${t('lti.relaunchHint')}`

function describe(err: unknown): string {
  switch (getErrorCode(err)) {
    case 'lti_link_challenge_spent':
      return withRelaunch('lti.link.errors.spent')
    case 'lti_link_challenge_invalid':
      return withRelaunch('lti.link.errors.invalid')
    case 'lti_identity_taken':
      return t('lti.link.errors.identityTaken')
    case 'direct_login_required':
      return t('lti.link.errors.directLoginRequired')
    default:
      return withRelaunch('lti.link.errors.generic')
  }
}

/** Whether a failed attempt leaves the challenge worth keeping. */
function isSpent(err: unknown): boolean {
  const code = getErrorCode(err)
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
    error.value = withRelaunch('lti.link.errors.noPending')
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
  <StatusPage>
    <StatusScreen v-if="state === 'working'" loading :text="$t('lti.link.working')" />

    <StatusScreen
      v-else-if="state === 'needs-login'"
      :icon="Link2"
      :title="$t('lti.link.confirmTitle')"
      :text="$t('lti.link.confirmText')"
    >
      <BaseButton data-testid="link-login" size="sm" @click="signIn">
        {{ $t('lti.link.signIn') }}
      </BaseButton>
    </StatusScreen>

    <StatusScreen
      v-else-if="state === 'linked'"
      data-testid="link-success"
      :icon="CheckCircle2"
      tone="success"
      :title="$t('lti.link.linkedTitle')"
      :text="`${$t('lti.link.linkedText')} ${$t('lti.relaunchHint')}`"
    />

    <StatusScreen
      v-else
      data-testid="link-error"
      :icon="AlertCircle"
      tone="danger"
      :title="$t('lti.link.errorTitle')"
      :text="error ?? ''"
    />
  </StatusPage>
</template>
