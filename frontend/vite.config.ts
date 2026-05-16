import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const backendOrigin = env.VITE_API_URL || 'http://127.0.0.1:8081'

  return {
    plugins: [react()],
    server: {
      port: 5173,
      strictPort: false,
      proxy: {
        '/api': { target: backendOrigin, changeOrigin: true },
        '/uploads': { target: backendOrigin, changeOrigin: true },
      },
    },
  }
})
