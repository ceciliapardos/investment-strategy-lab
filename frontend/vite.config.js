import os from 'node:os'
import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // La caché de Vite se guarda fuera de OneDrive: la sincronización bloqueaba
  // node_modules/.vite y el servidor no arrancaba (EPERM al borrar la carpeta).
  cacheDir: path.join(os.tmpdir(), 'investment-strategy-lab-vite'),
  // Tests unitarios (Vitest). Los E2E están en e2e/ y se ejecutan con Playwright.
  test: {
    include: ['src/**/*.test.{js,jsx}'],
    environment: 'node',
  },
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
