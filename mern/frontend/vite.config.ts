import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  const backendUrl = env.VITE_API_BASE_URL || 'http://localhost:5000'
  const voiceUrl   = env.VITE_VOICE_URL    || 'http://localhost:4001'

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/auth': {
          target:       backendUrl,
          changeOrigin: true,
        },
        '/api': {
          target:       backendUrl,
          changeOrigin: true,
        },
        '/voice': {
          target:       voiceUrl,
          changeOrigin: true,
          rewrite:      (path) => path.replace(/^\/voice/, ''),
          secure:       false,
        },
      },
    },
  }
})