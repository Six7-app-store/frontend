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
</script>

<template>
  <div class="flex flex-col items-center justify-center min-h-screen">
    <div class="flex flex-col items-center gap-4 text-center max-w-md px-4">
      <Clock class="text-gray-400" :size="48" />
      <div>
        <p class="font-semibold">Sitzung abgelaufen</p>
        <p class="text-sm text-gray-600 mt-2">
          Die Anmeldung über Moodle ist abgelaufen. Bitte die Aktivität im
          Moodle-Kurs erneut öffnen, um weiterzuarbeiten.
        </p>
      </div>
    </div>
  </div>
</template>
