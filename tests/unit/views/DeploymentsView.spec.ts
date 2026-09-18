/**
 * ``DeploymentsView`` hosts the deployment list and detail pages. Switching
 * from one deployment's detail page to another must mount the detail page
 * again, because it reads the deployment id once on setup.
 */
import { describe, it, expect } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, h, onMounted } from 'vue'
import { createMemoryHistory, createRouter, RouterView, useRoute } from 'vue-router'
import DeploymentsView from '@/views/DeploymentsView.vue'

const mountedIds: string[] = []

const DetailStub = defineComponent({
  setup() {
    const id = useRoute().params.id as string
    onMounted(() => mountedIds.push(id))
    return () => h('div', `detail ${id}`)
  },
})

describe('DeploymentsView', () => {
  it('mountet die Detailseite beim Wechsel zu einem anderen Deployment neu', async () => {
    mountedIds.length = 0
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        {
          path: '/deployments',
          component: DeploymentsView,
          children: [
            { path: '', name: 'deployments.list', component: { render: () => h('div', 'list') } },
            { path: '/deployments/:id', name: 'deployments.detail', component: DetailStub },
          ],
        },
      ],
    })
    await router.push('/deployments/a')
    await router.isReady()
    const wrapper = mount(RouterView, { global: { plugins: [router] } })
    await flushPromises()

    await router.push('/deployments/b')
    await flushPromises()

    expect(mountedIds).toEqual(['a', 'b'])
    expect(wrapper.text()).toBe('detail b')
  })
})
