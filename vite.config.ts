import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
  ],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },

  server: {
    // A Moodle LTI launch lands on this dev server under
    // host.docker.internal, not localhost — that name is what both the
    // browser and the containers can resolve to the same machine, so it
    // is what the backend redirects to. Vite rejects Host headers it
    // does not know with a bare 403, which looks like a broken launch
    // rather than a dev-server setting.
    //
    // Dev only: `vite build` does not read this, and the production
    // image serves the built assets through nginx.
    allowedHosts: ['localhost', 'host.docker.internal'],
  },
})