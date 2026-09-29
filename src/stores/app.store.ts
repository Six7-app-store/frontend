import { defineStore } from 'pinia'
import { appApi } from '@/api/app.api'
import type { App } from '@/types'
import { requestContext, runRequest } from './_request'

export const useAppStore = defineStore('app', {
  state: () => ({
    apps: [] as App[],
    isLoading: false,
    error: null as string | null,
  }),

  actions: {
    async fetchApps(userId?: string) {
      await runRequest(requestContext(this), async () => {
        const { data } = await appApi.list({ userId })
        this.apps = data
      }, 'Failed to fetch apps', { rethrow: false })
    },

    async fetchAppVariables(appId: string, version: string) {
      const { data } = await appApi.getVariables(appId, version)
      return data
    }
  },
})
