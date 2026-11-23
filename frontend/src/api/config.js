import axios from 'axios'

/**
 * Dirección del backend (FastAPI), única para toda la aplicación.
 *
 * - En local NO hace falta definirla: las peticiones van a rutas relativas
 *   (/api/...) y el proxy de Vite las envía a http://localhost:8000.
 * - En producción se define en el build con VITE_API_BASE_URL
 *   (p. ej. https://investment-strategy-lab-api.onrender.com).
 */
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/+$/, '')

/** true cuando la aplicación usa un backend remoto (despliegue público). */
export const IS_REMOTE_API = API_BASE_URL !== ''

if (IS_REMOTE_API) axios.defaults.baseURL = API_BASE_URL
