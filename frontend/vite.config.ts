import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
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
      '/api': process.env.API_PROXY_TARGET ?? 'http://localhost:8000',
    },
  },
})
