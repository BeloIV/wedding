import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    // dev only: mirror the nginx routing of the production container
    proxy: {
      '/api': 'http://localhost:8301',
      '/media': 'http://localhost:8301',
      '/django-admin': 'http://localhost:8301',
    },
  },
})
