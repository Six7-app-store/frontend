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
import { useI18n } from 'vue-i18n'
import { useAppCatalog } from '@/composables/useAppCatalog'
import { useLtiDeepLink } from '@/composables/useLtiDeepLink'
import { getErrorCode, getErrorStatus } from '@/utils/http-error'
import BaseButton from '@/components/ui/BaseButton.vue'
import StatusPage from '@/components/ui/StatusPage.vue'
import StatusScreen from '@/components/ui/StatusScreen.vue'
import { Link2, AlertCircle } from 'lucide-vue-next'

const route = useRoute()
const { t } = useI18n()

type State = 'loading' | 'ready' | 'sending' | 'error'

const state = ref<State>('loading')
const error = ref<string | null>(null)
const { apps, load: loadApps } = useAppCatalog()
const { select } = useLtiDeepLink()
const handle = ref<string | null>(null)
const selected = ref<string>('')

function describe(err: unknown): string {
  const code = getErrorCode(err)
  const status = getErrorStatus(err)
  if (code === 'lti_deep_link_expired') return t('lti.deepLink.errors.expired')
  if (code === 'lti_deep_link_foreign') return t('lti.deepLink.errors.foreign')
  if (status === 403) return t('lti.deepLink.errors.forbidden')
  if (status === 404) return t('lti.deepLink.errors.notFound')
  return t('lti.deepLink.errors.generic')
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
    const { returnUrl, jwt } = await select(handle.value, selected.value)
    postToMoodle(returnUrl, jwt)
  } catch (err) {
    console.error('Deep link selection failed:', err)
    error.value = describe(err)
    state.value = 'error'
  }
}

onMounted(async () => {
  handle.value = typeof route.query.dl === 'string' ? route.query.dl : null

  if (!handle.value) {
    error.value = t('lti.deepLink.errors.noRequest')
    state.value = 'error'
    return
  }

  try {
    await loadApps()
    state.value = 'ready'
  } catch (err) {
    console.error('Loading apps for the deep link failed:', err)
    error.value = t('lti.deepLink.errors.loadApps')
    state.value = 'error'
  }
})
</script>

<template>
  <StatusPage>
    <StatusScreen v-if="state === 'loading'" loading :text="$t('lti.deepLink.loading')" />
    <StatusScreen v-else-if="state === 'sending'" loading :text="$t('lti.deepLink.sending')" />

    <StatusScreen
      v-else-if="state === 'ready'"
      data-testid="deeplink-form"
      :icon="Link2"
      :title="$t('lti.deepLink.question')"
      :text="$t('lti.deepLink.intro')"
    >
      <div v-if="apps.length === 0" data-testid="deeplink-empty" class="text-sm text-fg-muted">
        {{ $t('lti.deepLink.empty') }}
      </div>

      <select
        v-else
        v-model="selected"
        data-testid="deeplink-app"
        class="field w-full px-3 py-2"
      >
        <option value="" disabled>{{ $t('lti.deepLink.choose') }}</option>
        <option v-for="app in apps" :key="app.appId" :value="app.appId">
          {{ app.name }}
        </option>
      </select>

      <BaseButton
        data-testid="deeplink-submit"
        size="sm"
        :disabled="!selected"
        @click="choose"
      >
        {{ $t('lti.deepLink.submit') }}
      </BaseButton>

      <p class="text-xs text-fg-muted">{{ $t('lti.deepLink.footnote') }}</p>
    </StatusScreen>

    <StatusScreen
      v-else
      data-testid="deeplink-error"
      :icon="AlertCircle"
      tone="danger"
      :title="$t('lti.deepLink.errorTitle')"
      :text="error ?? ''"
    />
  </StatusPage>
</template>
