import axios from 'axios'

const BASE = '/api/markets'

/** Todas las funciones aceptan un AbortSignal para cancelar peticiones obsoletas. */

export async function searchAssets(query, signal) {
  const { data } = await axios.get(`${BASE}/search`, { params: { q: query }, signal })
  return data
}

export async function getQuote(ticker, signal) {
  const { data } = await axios.get(`${BASE}/quote/${encodeURIComponent(ticker)}`, { signal })
  return data
}

/**
 * Rendimiento histórico con datos diarios.
 * range = { period: '1Y' }  o  { start: 'AAAA-MM-DD', end: 'AAAA-MM-DD' }
 */
export async function getPerformance(ticker, range, signal) {
  const params = range.start ? { start: range.start, end: range.end } : { period: range.period }
  const { data } = await axios.get(`${BASE}/performance/${encodeURIComponent(ticker)}`, { params, signal })
  return data
}

export async function getTer(ticker, signal) {
  const { data } = await axios.get(`${BASE}/ter/${encodeURIComponent(ticker)}`, { signal })
  return data
}

export function isCancel(err) {
  return axios.isCancel(err)
}

/** Mensaje legible para el usuario a partir de un error de axios. */
export function getErrorMessage(err) {
  const apiMessage = err?.response?.data?.error?.message
  if (apiMessage) return apiMessage
  // Sin respuesta, o un 5xx sin el formato de error de nuestra API: es el proxy
  // de Vite indicando que el backend no está accesible.
  if (!err?.response || err.response.status >= 500) {
    return 'No se puede conectar con el servidor de datos. Comprueba que el backend está en ejecución (start_backend.bat).'
  }
  return 'El servidor no ha podido responder correctamente. Inténtalo de nuevo.'
}
