import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      // SW file is generated into dist/ at build time; dev mode uses a virtual SW
      devOptions: { enabled: true },
      workbox: {
        // Pre-cache all built assets
        globPatterns: ['**/*.{js,css,html,svg,ico,woff,woff2}'],
        runtimeCaching: [
          {
            // Network-first for all backend API calls; fall back to cache after 10 s
            urlPattern: /^\/api\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 10,
              expiration: { maxEntries: 100, maxAgeSeconds: 300 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // StaleWhileRevalidate for Module Federation remoteEntry.js files so
            // the app loads instantly from cache while the remote updates in the background
            urlPattern: /remoteEntry\.js$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'mf-remotes',
              expiration: { maxEntries: 20, maxAgeSeconds: 86400 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      manifest: {
        name: 'Spin Core',
        short_name: 'Spin',
        description: 'Spin Core micro-frontend platform',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        icons: [
          {
            // SVG works for modern browsers; add 192/512 PNGs for full installability
            src: '/favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@components': fileURLToPath(new URL('./src/components', import.meta.url)),
      '@pages':      fileURLToPath(new URL('./src/pages',      import.meta.url)),
      '@services':   fileURLToPath(new URL('./src/services',   import.meta.url)),
      '@hooks':      fileURLToPath(new URL('./src/hooks',      import.meta.url)),
      '@context':    fileURLToPath(new URL('./src/context',    import.meta.url)),
      '@utils':      fileURLToPath(new URL('./src/utils',      import.meta.url)),
      '@constants':  fileURLToPath(new URL('./src/constants',  import.meta.url)),
      '@i18n':       fileURLToPath(new URL('./src/i18n',       import.meta.url)),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: process.env.API_PROXY_TARGET ?? 'http://localhost:8000',
        ws: true,
      },
    },
  },
})
