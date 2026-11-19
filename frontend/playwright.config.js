import os from 'node:os'
import path from 'node:path'
import { defineConfig } from '@playwright/test'

/**
 * Tests E2E (navegador real).
 * Requisitos: backend (start_backend.bat) y frontend (start_frontend.bat) arrancados.
 * Ejecutar desde frontend/:   npm run test:e2e
 *
 * Usa Microsoft Edge ya instalado en Windows (channel 'msedge'): no hace falta
 * descargar navegadores de Playwright.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  expect: { timeout: 20_000 },
  workers: 1,               // comparten el mismo backend y Yahoo: mejor en serie
  retries: 0,
  reporter: [['list']],
  // Fuera de OneDrive: la sincronización bloquea las carpetas temporales (EPERM).
  outputDir: path.join(os.tmpdir(), 'investment-strategy-lab-e2e'),
  use: {
    baseURL: 'http://localhost:5173',
    channel: 'msedge',
    headless: true,
    viewport: { width: 1366, height: 900 },
    locale: 'es-ES',
    trace: 'off',
    screenshot: 'only-on-failure',
  },
})
