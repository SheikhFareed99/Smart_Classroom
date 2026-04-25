import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/auth': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/voice': {
        target:       'http://localhost:4001',
        changeOrigin: true,
        rewrite:      (path) => path.replace(/^\/voice/, ''),
        ws:           true,  // ← UNCOMMENT THIS — required for Socket.io
        secure:       false,
      },
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
})