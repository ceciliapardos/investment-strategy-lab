/**
 * Persistencia de las estrategias en localStorage (solo en este navegador).
 *
 * Formato guardado:  { version: 1, activeId: string|null, strategies: [...] }
 * Clave:             'isl.strategies'
 *
 * - Todo acceso está protegido con try/catch: si el navegador bloquea el
 *   almacenamiento (modo privado estricto), la app funciona sin guardar.
 * - Al leer se validan los datos; si están dañados se guarda una copia en
 *   'isl.strategies.corrupt' y se empieza de cero, avisando al usuario.
 * - El número de versión permite migrar el formato en el futuro (p. ej. al
 *   añadir aportaciones periódicas) sin perder las estrategias existentes.
 */
import { FREQUENCY_KEYS, LIMITS, SCHEMA_VERSION } from './model'

export const STORAGE_KEY = 'isl.strategies'
const CORRUPT_KEY = 'isl.strategies.corrupt'

const isStr = v => typeof v === 'string'
const numOrNull = v => (typeof v === 'number' && Number.isFinite(v) ? v : null)

function sanitizeAsset(a) {
  if (!a || !isStr(a.ticker) || !a.ticker.trim()) return null
  return {
    ticker: a.ticker.trim().toUpperCase(),
    name: isStr(a.name) ? a.name : a.ticker,
    assetType: isStr(a.assetType) ? a.assetType : 'Stock',
    currency: isStr(a.currency) ? a.currency : '',
    exchange: isStr(a.exchange) ? a.exchange : '',
    weight: numOrNull(a.weight),
  }
}

function sanitizeStrategy(s) {
  if (!s || !isStr(s.id) || !isStr(s.name) || !Array.isArray(s.assets)) return null
  const seen = new Set()
  const assets = []
  for (const raw of s.assets) {
    const a = sanitizeAsset(raw)
    if (a && !seen.has(a.ticker)) {
      seen.add(a.ticker)
      assets.push(a)
    }
  }
  // Aportaciones periódicas (Fase 5.1): campo opcional; las estrategias antiguas no lo tienen.
  const contributions = (Array.isArray(s.recurringContributions) ? s.recurringContributions : [])
    .filter(c => c && isStr(c.id) && isStr(c.ticker) && FREQUENCY_KEYS.includes(c.frequency))
    .slice(0, LIMITS.maxContributions)
    .map(c => ({ id: c.id, ticker: c.ticker.trim().toUpperCase(), amount: numOrNull(c.amount), frequency: c.frequency }))
  return {
    id: s.id,
    name: s.name.slice(0, LIMITS.nameMax),
    initialCapital: numOrNull(s.initialCapital),
    baseCurrency: isStr(s.baseCurrency) ? s.baseCurrency : 'EUR',
    assets: assets.slice(0, LIMITS.maxAssets),
    recurringContributions: contributions,
    createdAt: isStr(s.createdAt) ? s.createdAt : new Date().toISOString(),
    updatedAt: isStr(s.updatedAt) ? s.updatedAt : new Date().toISOString(),
  }
}

/** Convierte datos de versiones anteriores al formato actual (hoy solo existe la v1). */
function migrate(data) {
  if (data && data.version === SCHEMA_VERSION) return data
  return null
}

/** Valida y limpia el contenido leído. Lanza un error si no es utilizable. */
export function parseStored(raw) {
  const data = migrate(JSON.parse(raw))
  if (!data || !Array.isArray(data.strategies)) throw new Error('formato no reconocido')
  const ids = new Set()
  const strategies = []
  for (const s of data.strategies.slice(0, LIMITS.maxStrategies)) {
    const clean = sanitizeStrategy(s)
    if (clean && !ids.has(clean.id)) {
      ids.add(clean.id)
      strategies.push(clean)
    }
  }
  const activeId = strategies.some(s => s.id === data.activeId) ? data.activeId : strategies[0]?.id ?? null
  return { strategies, activeId }
}

export function loadState(storage = globalThis.localStorage) {
  let raw = null
  try {
    raw = storage?.getItem(STORAGE_KEY) ?? null
  } catch {
    return { strategies: [], activeId: null, warning: 'unavailable' }
  }
  if (raw == null) return { strategies: [], activeId: null, warning: null }
  try {
    return { ...parseStored(raw), warning: null }
  } catch {
    try { storage.setItem(CORRUPT_KEY, raw) } catch { /* sin espacio: se ignora */ }
    return { strategies: [], activeId: null, warning: 'corrupt' }
  }
}

export function saveState({ strategies, activeId }, storage = globalThis.localStorage) {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify({ version: SCHEMA_VERSION, activeId, strategies }))
    return true
  } catch {
    return false
  }
}
