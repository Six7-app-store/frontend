import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from '@/App.vue'
import router from '@/router/index'
import i18n from './i18n'
import { useAuthStore } from '@/stores/auth.store'
import { installBranding } from '@/composables/useBranding'

import '@/style.css'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(i18n)
app.mount('#app')

// Accent colour, logos and favicon an admin configured; needs no login.
installBranding()

// Initialize auth store (loads user from localStorage if token exists)
const auth = useAuthStore()
auth.initialize()
