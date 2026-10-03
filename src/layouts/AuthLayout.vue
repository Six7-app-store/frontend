<template>
  <div class="flex min-h-screen bg-canvas">
    <!-- Hero: brand and a decorative surface. Purely visual, the panel carries the page's heading. -->
    <section class="login-hero relative hidden flex-1 overflow-hidden lg:block" aria-hidden="true">
      <div class="login-hero-sheen" />
      <div class="absolute left-[120px] top-1/2 flex -translate-y-1/2 flex-col gap-4">
        <img :src="logo" alt="" class="block h-auto w-[420px]" />
        <span class="pl-1 text-3xl font-semibold text-fg">Click'n Deploy</span>
        <span class="pl-1 text-base text-fg-muted">DHBW Mannheim</span>
      </div>
    </section>

    <!-- Panel: the page's content, language and theme at the bottom -->
    <section class="login-panel flex w-full shrink-0 flex-col lg:w-login-panel">
      <div class="flex flex-1 flex-col justify-center gap-6 px-8 py-12 sm:px-login-x">
        <!-- Without the hero (narrow screens) the brand moves into the panel. -->
        <img :src="logo" alt="Click'n Deploy" class="h-12 w-auto self-start lg:hidden" />
        <slot />
      </div>
      <div class="flex h-16 shrink-0 items-center justify-end gap-3 border-t border-faint px-8">
        <LocaleSwitch />
        <ThemeToggle />
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
/**
 * Frame of the pages outside the app shell — the login, the sign-in
 * callback and the Moodle (LTI) pages: a brand hero on the left, a glass
 * panel with the content on the right. Language and theme can be switched
 * here too, before anyone is signed in.
 */
import { useBranding } from '@/composables/useBranding'
import LocaleSwitch from '@/components/layout/LocaleSwitch.vue'
import ThemeToggle from '@/components/ui/ThemeToggle.vue'

const { logo } = useBranding()
</script>
