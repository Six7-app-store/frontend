<script setup lang="ts">
/**
 * End of a Moodle-launched session.
 *
 * There is deliberately no "sign in again" button here. A launched
 * session is tied to the Moodle activity it came from — the way back in
 * is to open that activity again, which also re-checks course
 * membership and the current role. Offering a Keycloak login instead
 * would drop the user into a different account, or none at all.
 */
import { Clock } from 'lucide-vue-next'
import StatusPage from '@/components/ui/StatusPage.vue'
import StatusScreen from '@/components/ui/StatusScreen.vue'
</script>

<template>
  <StatusPage>
    <StatusScreen :icon="Clock" :title="$t('lti.expired.title')" :text="$t('lti.expired.text')" />
  </StatusPage>
</template>
