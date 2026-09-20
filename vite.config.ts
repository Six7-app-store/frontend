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

    // The source tree reaches the container through a Windows bind mount,
    // and that mount delivers no inotify events. Without polling the
    // watcher never fires, so Vite keeps serving the transform it cached
    // at startup: the file on disk is fixed, `curl
    // http://localhost:5173/src/views/Foo.vue` still shows the old one,
    // and a browser reload changes nothing. It reads like the fix did not
    // work rather than like a dev-server setting.
    //
    // Dev only: `vite build` does not read `server`.
    watch: {
      usePolling: true,
      interval: 300,
      // A coverage run writes ~150 HTML files at once, and every one of
      // them triggers a full page reload in an open tab.
      ignored: ['**/coverage/**'],
    },
  },
})