import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [react()],
  base: process.env.GITHUB_PAGES_BASE ?? '/',
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@canvas': fileURLToPath(new URL('./src/features/canvas/runtime', import.meta.url)),
    },
  },
  build: {
    rolldownOptions: {
      input: {
        app: fileURLToPath(new URL('./index.html', import.meta.url)),
        canvas: fileURLToPath(new URL('./canvas-runtime.html', import.meta.url)),
      },
    },
  },
  server: {
    port: 9091,
    strictPort: false,
    host: '127.0.0.1',
    proxy: {
      '/api': {
        target: process.env.VITE_API_PROXY_TARGET ?? 'https://ai-tools.xingyao-mcn.cn',
        changeOrigin: true,
      },
    },
    watch: {
      usePolling: true,
      interval: 300,
    },
  },
})
