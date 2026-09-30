<script setup lang="ts">
import { ROUTE_NAMES } from '@/router/route-names'
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from '@/composables/useToast'
import { getErrorDetailMessage, getErrorStatus, getErrorStatusText, hasErrorResponse } from '@/utils/http-error'
import { useNewApp } from '@/composables/useNewApp'
import { useI18n } from 'vue-i18n'
import MarkdownEditor from '@/components/MarkdownEditor.vue'
import AppCard from '@/components/app/AppCard.vue'
import AlertBox from '@/components/ui/AlertBox.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import Card from '@/components/ui/Card.vue'
import FormField from '@/components/ui/FormField.vue'
import SegmentedControl from '@/components/ui/SegmentedControl.vue'
import type { SegmentOption } from '@/components/ui/segment'
import ToggleSwitch from '@/components/ui/ToggleSwitch.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import ImageDropZone from '@/components/ui/ImageDropZone.vue'
import { useImageUpload } from '@/composables/useImageUpload'

import { Globe, Lock } from 'lucide-vue-next'

const { t } = useI18n()
const router = useRouter()
const toast = useToast()
const isLoading = ref(false)

const { githubAppInstallUrl, loadGithubAppInstallUrl, create } = useNewApp()

const form = ref({
  name: '',
  description: '',
  repoUrl: '',
  isPrivate: false,
  submitAllVersions: false,
})

const {
  file: logoFile,
  previewUrl: logoPreviewUrl,
  choose: chooseLogo,
  remove: removeLogo,
} = useImageUpload()

onMounted(loadGithubAppInstallUrl)

type Visibility = 'public' | 'private'

const visibility = computed<Visibility>({
  get: () => (form.value.isPrivate ? 'private' : 'public'),
  set: (next) => { form.value.isPrivate = next === 'private' },
})

const visibilityOptions = computed<SegmentOption<Visibility>[]>(() => [
  { value: 'public', label: t('AppsCreateView.form.visibilityPublic'), icon: Globe },
  { value: 'private', label: t('AppsCreateView.form.visibilityPrivate'), icon: Lock },
])

const isValidGitUrl = (url: string) => {
  const regex = /^(https?:\/\/|git@)[\w.-]+[\/:].+/
  return regex.test(url)
}

const handleSubmit = async () => {
  if (!form.value.name || !form.value.repoUrl) {
    toast.error(t('AppsCreateView.messages.missingFields'))
    return
  }

  if (!isValidGitUrl(form.value.repoUrl)) {
    toast.error(t('AppsCreateView.messages.invalidUrl'))
    return
  }

  isLoading.value = true
  try {
    await create(form.value, logoFile.value)

    toast.success(t('AppsCreateView.messages.success'))
    router.push({ name: ROUTE_NAMES.apps })

  } catch (error: any) {
    console.error('API Error:', error)

    if (hasErrorResponse(error)) {
      const status = getErrorStatus(error)
      if (status === 403) {
        toast.error(t('AppsCreateView.messages.noAccess'))
      } else if (status === 400 || status === 422) {
        // Validation error, not a permission problem: show the backend's own
        // message when it sent one.
        toast.error(getErrorDetailMessage(error) || t('AppsCreateView.messages.validationError'))
      } else {
        toast.error(t('AppsCreateView.messages.serverError', { statusText: getErrorStatusText(error) || 'Unknown' }))
      }
    } else {
      toast.error(t('AppsCreateView.messages.networkError'))
    }
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="max-w-detail">
    <PageHeader :title="$t('AppsCreateView.title')" :subtitle="$t('AppsCreateView.form.subtitle')" />

    <div class="grid grid-cols-1 items-start gap-12 lg:grid-cols-[minmax(0,1fr)_var(--aside-w)]">
      <form class="flex min-w-0 flex-col gap-section" novalidate @submit.prevent="handleSubmit">
        <Card>
          <div class="flex flex-col gap-5">
            <FormField v-slot="{ id }" :label="$t('AppsCreateView.form.nameLabel')" required>
              <BaseInput :id="id" v-model="form.name" :placeholder="$t('AppsCreateView.form.namePlaceholder')" />
            </FormField>

            <FormField v-slot="{ id }" :label="$t('AppsCreateView.form.repoLabel')" required>
              <BaseInput :id="id" v-model="form.repoUrl" class="font-mono" :placeholder="$t('AppsCreateView.form.repoPlaceholder')" />
            </FormField>

            <FormField :label="$t('AppsCreateView.form.descLabel')" :hint="$t('AppsCreateView.form.descMarkdownHint')">
              <MarkdownEditor
                v-model="form.description"
                :placeholder="$t('AppsCreateView.form.descPlaceholder')"
                :min-height-px="120"
                :max-height-px="320"
              />
            </FormField>

            <FormField :label="$t('AppsCreateView.form.logoLabel')">
              <ImageDropZone
                :preview-url="logoPreviewUrl"
                :caption="logoFile?.name ?? ''"
                :placeholder="$t('AppsCreateView.form.logoSelect')"
                :remove-label="$t('AppsCreateView.form.logoRemove')"
                @select="chooseLogo"
                @remove="removeLogo"
              />
            </FormField>
          </div>
        </Card>

        <Card>
          <div class="flex flex-col gap-5">
            <FormField
              :label="$t('AppsCreateView.form.visibilityLabel')"
              :hint="form.isPrivate ? $t('AppsCreateView.form.visibilityPrivateHint') : $t('AppsCreateView.form.visibilityPublicHint')"
            >
              <SegmentedControl
                v-model="visibility"
                size="md"
                class="self-start"
                :options="visibilityOptions"
                :ariaLabel="$t('AppsCreateView.form.visibilityLabel')"
              />
            </FormField>

            <!-- Submitting versions only makes sense for apps others can see. -->
            <div v-if="!form.isPrivate" class="flex items-center justify-between gap-6 border-t border-faint pt-5">
              <div class="flex min-w-0 flex-col gap-0.5">
                <p class="text-sm font-semibold text-fg">{{ $t('AppsCreateView.form.submitAllLabel') }}</p>
                <p class="text-sm text-fg-muted">{{ $t('AppsCreateView.form.submitAllHint') }}</p>
              </div>
              <ToggleSwitch v-model="form.submitAllVersions" :label="$t('AppsCreateView.form.submitAllLabel')" />
            </div>
          </div>
        </Card>

        <AlertBox tone="info" :title="$t('AppsCreateView.info.important')">
          <span v-html="$t('AppsCreateView.info.installText')"></span>
          <template v-if="githubAppInstallUrl">
            <br>
            <a
              :href="githubAppInstallUrl"
              target="_blank"
              rel="noopener noreferrer"
              data-testid="github-app-install-link"
              class="link break-all"
            >
              {{ githubAppInstallUrl }}
            </a>
          </template>
        </AlertBox>

        <div class="flex justify-end gap-3">
          <RouterLink :to="{ name: ROUTE_NAMES.apps }" class="btn btn-secondary">
            {{ $t('AppsCreateView.form.cancel') }}
          </RouterLink>
          <BaseButton type="submit" :disabled="isLoading">
            {{ isLoading ? $t('AppsCreateView.buttons.saving') : $t('AppsCreateView.buttons.add') }}
          </BaseButton>
        </div>
      </form>

      <!-- The card exactly as the catalogue will show it -->
      <aside class="flex flex-col gap-2 lg:sticky lg:top-0">
        <p class="text-xs text-fg-subtle">{{ $t('AppsCreateView.preview.badge') }}</p>
        <AppCard
          :name="form.name || $t('AppsCreateView.preview.defaultName')"
          :description="form.description"
          :status="form.isPrivate ? 'private' : 'new'"
          :empty-text="$t('AppsCreateView.preview.defaultDesc')"
        />
      </aside>
    </div>
  </div>
</template>
