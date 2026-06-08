import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import type {} from 'vitest/config'

const proxyTarget = process.env.VITE_PROXY_TARGET || 'http://localhost:8080';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api/ws': {
        target: proxyTarget,
        ws: true,
        changeOrigin: true,
      },
      '/api': {
        target: proxyTarget,
        changeOrigin: true,
      },
    },
  },
  test: {
    globals: true,
    environment: 'happy-dom',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
})
