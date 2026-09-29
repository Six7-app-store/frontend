import { defineStore } from 'pinia'
import { deploymentApi } from '@/api/deployment.api'
import { requestContext, runRequest } from './_request'
import { getErrorDetailMessage, getErrorStatus } from '@/utils/http-error'
import { buildDeploymentPayload } from '@/services/deployment-draft.service'

import type {
  Deployment,
  DeploymentWithRelations,
  DeploymentCreate,
  DeploymentStatus,
  DeploymentDraft,
  AppVariable
} from '@/types'

const defaultDraft: DeploymentDraft = {
  appId: null,
  name: '',
  releaseTag: '',
  courseIds: [],
  studentIds: [],
  groupMode: 'one',
  groupCount: 1,
  assignments: [],

  // --- These must match the interface ---
  version: 'latest',
  variables: {},
  userInputVar: {},
  groupNames: [],
  variableDefinitions: [] as AppVariable[], // stores the API definitions for the variables
  // ``fileUploads`` is the wizard-side staging area for files. Each
  // ``@openstack:file:<scope>``-marked variable contributes one entry
  // here, with inner-keys driven by the scope. ``submitDraft`` ships
  // the whole map under ``DeploymentCreate.files``.
  fileUploads: {}
}

export const useDeploymentStore = defineStore('deployment', {
  state: () => ({
    deployments: [] as Deployment[],

    currentDeployment: null as DeploymentWithRelations | null,
    isLoading: false,
    error: null as string | null,

    // The wizard state (draft).
    draft: JSON.parse(JSON.stringify(defaultDraft)) as DeploymentDraft,

    // Global cache for students (userId → object).
    studentCache: new Map<string, any>(),
  }),

  actions: {
    async fetchDeployments(params?: { userId?: string; appId?: string; status?: DeploymentStatus }) {
      await runRequest(requestContext(this), async () => {
        const response = await deploymentApi.list(params)
        this.deployments = response.data
      }, 'Failed to fetch deployments', { rethrow: false })
    },

    async fetchDeploymentById(id: string) {
      this.isLoading = true; this.error = null
      try {
        const response = await deploymentApi.getById(id)
        this.currentDeployment = response.data
      } catch (err) {
        // 404 = deployment was soft-deleted upstream (e.g. after a successful
        // destroy). This is not a UI error state: the DetailView's stream-ended
        // watcher checks ``currentDeployment === null`` as a soft-delete signal
        // and navigates to the list with a success toast. Other status codes
        // (5xx, network timeout) keep the error path intact.
        const status = getErrorStatus(err)
        if (status === 404) {
          this.currentDeployment = null
        } else {
          this.error = getErrorDetailMessage(err) || 'Failed to fetch deployment'
        }
      } finally {
        this.isLoading = false
      }
    },

    async createDeployment(data: DeploymentCreate) {
      return runRequest(requestContext(this), async () => {
        const response = await deploymentApi.create(data)
        this.deployments.push(response.data)
        return response.data
      }, 'Failed to create deployment')
    },

    /**
     * Delete a deployment. Returns the raw HTTP response so the caller
     * can branch on status (202 = destroy task dispatched, watch the
     * SSE stream; 204 = soft-deleted immediately).
     *
     * Drops the row from the local list either way — the deployment
     * either disappears now (204) or shortly when the destroy task
     * completes and auto-soft-deletes it (202). Keeping it in the
     * sidebar list while it's running would only confuse the user;
     * the live progress lives in the detail view that issued the call.
     */
    async deleteDeployment(id: string) {
      return runRequest(requestContext(this), async () => {
        const response = await deploymentApi.delete(id)
        this.deployments = this.deployments.filter((d: any) => d.deploymentId !== id)
        return response
      }, 'Failed to delete deployment')
    },

    /**
     * Pause a running deployment. Returns the raw HTTP response (202
     * with ``{task_id, status: "pausing"}``) so the detail view can
     * attach the SSE stream and switch into the live-progress UI.
     *
     * Unlike ``deleteDeployment``, the deployment row stays in the
     * list — pausing isn't a destruction, the user expects to find
     * it again under the new "paused" status. Status refresh comes
     * via the next list fetch or the SSE ``succeeded`` event.
     */
    async pauseDeployment(id: string) {
      return runRequest(requestContext(this), () => deploymentApi.pause(id), 'Failed to pause deployment')
    },

    /**
     * Resume a paused deployment. Mirrors ``pauseDeployment`` —
     * returns the 202 ``{task_id, status: "resuming"}`` response so
     * the detail view can attach the live stream.
     */
    async resumeDeployment(id: string) {
      return runRequest(requestContext(this), () => deploymentApi.resume(id), 'Failed to resume deployment')
    },

    resetDraft() {
      this.draft = JSON.parse(JSON.stringify(defaultDraft))
    },

    /**
     * Submit the current draft (see ``buildDeploymentPayload``) and return
     * the created deployment.
     */
    async submitDraft() {
      if (!this.draft.appId || !this.draft.name) {
        throw new Error("App und Name sind Pflichtfelder")
      }
      return this.createDeployment(buildDeploymentPayload(this.draft))
    }
  }
})