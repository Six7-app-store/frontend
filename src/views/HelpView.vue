<script setup lang="ts">
import { HelpCircle, Layers, BookOpen, FileText } from 'lucide-vue-next'
import { useRole } from '@/composables/useRole'

// The help text described one workflow — the lecturer's. A student cannot
// start a deployment or open a course, so those parts are staff-only and
// the page/section blurbs get a student wording instead.
const { canCreateDeployment, isStaff } = useRole()
</script>

<template>
  <div class="bg-white rounded-2xl p-10 border shadow-sm">
    <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-8">
      <div class="flex items-center gap-4 text-primary">
        <HelpCircle :size="28" />
        <div>
          <h1 class="text-2xl font-bold">{{ $t('HelpView.title') }}</h1>
          <p class="text-sm text-gray-500">{{ $t('HelpView.subtitle') }}</p>
        </div>
      </div>
    </div>

    <p class="text-gray-600 leading-7 max-w-3xl mb-8">
      {{ canCreateDeployment ? $t('HelpView.intro') : $t('HelpView.introStudent') }}
    </p>

    <div class="grid gap-4 lg:grid-cols-2">
      <article class="rounded-3xl border border-slate-200 bg-slate-50 p-6">
        <div class="flex items-center gap-3 mb-4 text-primary">
          <Layers :size="20" />
          <h2 class="text-lg font-semibold">{{ $t('HelpView.troubleshooting.title') }}</h2>
        </div>
        <p class="text-gray-600 leading-7 mb-4">
          {{ $t('HelpView.troubleshooting.description') }}
        </p>
        <ul class="list-disc list-inside space-y-2 text-gray-600">
          <!-- Quotas belong to the OpenStack project a lecturer's
               credentials point at; a student has none to check. -->
          <li v-if="canCreateDeployment">{{ $t('HelpView.troubleshooting.item1') }}</li>
          <li>{{ canCreateDeployment ? $t('HelpView.troubleshooting.item2') : $t('HelpView.troubleshooting.item2Student') }}</li>
        </ul>
      </article>

      <article class="rounded-3xl border border-slate-200 bg-slate-50 p-6">
        <div class="flex items-center gap-3 mb-4 text-primary">
          <BookOpen :size="20" />
          <h2 class="text-lg font-semibold">{{ $t('HelpView.quickHelp.title') }}</h2>
        </div>
        <template v-if="canCreateDeployment">
          <p class="text-sm font-semibold text-slate-700 mb-3">{{ $t('HelpView.quickHelp.processTitle') }}</p>
          <ol class="list-decimal list-inside space-y-3 text-gray-600">
            <li>{{ $t('HelpView.quickHelp.step1') }}</li>
            <li>{{ $t('HelpView.quickHelp.step2') }}</li>
            <li>{{ $t('HelpView.quickHelp.step3') }}</li>
            <li>{{ $t('HelpView.quickHelp.step4') }}</li>
            <li>{{ $t('HelpView.quickHelp.step5') }}</li>
          </ol>
        </template>
        <template v-else>
          <p class="text-sm font-semibold text-slate-700 mb-3">{{ $t('HelpView.quickHelp.processTitleStudent') }}</p>
          <ol class="list-decimal list-inside space-y-3 text-gray-600">
            <li>{{ $t('HelpView.quickHelp.studentStep1') }}</li>
            <li>{{ $t('HelpView.quickHelp.studentStep2') }}</li>
            <li>{{ $t('HelpView.quickHelp.studentStep3') }}</li>
          </ol>
        </template>
        <div class="mt-6 space-y-4 text-gray-700">
          <div>
            <h3 class="font-semibold text-base">{{ $t('HelpView.quickHelp.pageDashboardTitle') }}</h3>
            <p class="text-gray-600">
              {{ canCreateDeployment ? $t('HelpView.quickHelp.pageDashboard') : $t('HelpView.quickHelp.pageDashboardStudent') }}
            </p>
          </div>
          <div>
            <h3 class="font-semibold text-base">{{ $t('HelpView.quickHelp.pageAppsTitle') }}</h3>
            <p class="text-gray-600">
              {{ canCreateDeployment ? $t('HelpView.quickHelp.pageApps') : $t('HelpView.quickHelp.pageAppsStudent') }}
            </p>
          </div>
          <!-- Courses is a staff-only route; for a student the entry would
               describe a page they cannot open. -->
          <div v-if="isStaff">
            <h3 class="font-semibold text-base">{{ $t('HelpView.quickHelp.pageCoursesTitle') }}</h3>
            <p class="text-gray-600">{{ $t('HelpView.quickHelp.pageCourses') }}</p>
          </div>
          <div>
            <h3 class="font-semibold text-base">
              {{ canCreateDeployment ? $t('HelpView.quickHelp.pageDeploymentsTitle') : $t('HelpView.quickHelp.pageEnvironmentsTitle') }}
            </h3>
            <p class="text-gray-600">
              {{ canCreateDeployment ? $t('HelpView.quickHelp.pageDeployments') : $t('HelpView.quickHelp.pageEnvironments') }}
            </p>
          </div>
        </div>
      </article>

      <article class="rounded-3xl border border-slate-200 bg-slate-50 p-6">
        <div class="flex items-center gap-3 mb-4 text-primary">
          <BookOpen :size="20" />
          <h2 class="text-lg font-semibold">{{ $t('HelpView.resources.title') }}</h2>
        </div>
        <p class="text-gray-600 leading-7 mb-4">
          {{ $t('HelpView.resources.description') }}
        </p>
        <ul class="list-disc list-inside space-y-2 text-gray-600">
          <li>
            <a href="https://github.com/six7-click-n-deploy/frontend" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">
              {{ $t('HelpView.resources.frontendRepo') }}
            </a>
          </li>
          <li>
            <a href="https://github.com/six7-click-n-deploy/backend" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">
              {{ $t('HelpView.resources.backendRepo') }}
            </a>
          </li>
          <li>
            <a href="https://github.com/six7-click-n-deploy/deployment" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">
              {{ $t('HelpView.resources.deploymentRepo') }}
            </a>
          </li>
          <li>
            <a href="https://github.com/six7-click-n-deploy/worker" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">
              {{ $t('HelpView.resources.workerRepo') }}
            </a>
          </li>
        </ul>
      </article>

      <article class="rounded-3xl border border-slate-200 bg-slate-50 p-6">
        <div class="flex items-center gap-3 mb-4 text-primary">
          <FileText :size="20" />
          <h2 class="text-lg font-semibold">{{ $t('HelpView.docs.title') }}</h2>
        </div>
        <p class="text-gray-600 leading-7 mb-4">
          {{ $t('HelpView.docs.description') }}
        </p>
        <ul class="list-disc list-inside space-y-3 text-gray-600">
          <li>
            <a href="https://github.com/six7-click-n-deploy/deployment/blob/main/README.md" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">
              {{ $t('HelpView.docs.linkAdmin') }}
            </a>
          </li>
          <li>
            <a href="https://github.com/six7-click-n-deploy/.github/blob/main/docs/technologiestack.md" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">
              {{ $t('HelpView.docs.linkTech') }}
            </a>
          </li>
          <li>
            <a href="https://github.com/six7-click-n-deploy/template-app/blob/main/README.md" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">
              {{ $t('HelpView.docs.linkAppDev') }}
            </a>
          </li>
        </ul>
      </article>

    </div>
  </div>
</template>