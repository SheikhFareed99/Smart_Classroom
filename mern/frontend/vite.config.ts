import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/auth': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      // All requests starting with /voice are forwarded to voice_service.
      // /voice/api/channels → http://localhost:4001/api/channels
      // /voice/api/ice-config → http://localhost:4001/api/ice-config
      // Socket.io connections to /voice/socket.io → http://localhost:4001/socket.io
      '/voice': {
        target:       'http://localhost:4001',
        changeOrigin: true,
        rewrite:      (path) => path.replace(/^\/voice/, ''),
        ws:           true,   // ← required for Socket.io WebSocket upgrade
      },
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
})
