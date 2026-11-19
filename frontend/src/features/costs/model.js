/**
 * Cost Analysis: estado recordado en el navegador y utilidades puras.
 * Las TARIFAS no viven aquí: llegan del backend (backend/data/broker_fees.json).
 */
const KEY = 'isl.costs'

export const NONE_ID = 'none'
export const CUSTOM_ID = 'custom'

/** Campos del escenario «Costes personalizados» (límites iguales a los del backend). */
export const CUSTOM_FIELDS = [
  { key: 'buy_fixed', group: 'Compra', label: 'Fija por operación', unit: '€', max: 1000 },
  { key: 'buy_rate', group: 'Compra', label: 'Porcentaje', unit: '%', max: 10 },
  { key: 'buy_min', group: 'Compra', label: 'Mínimo por operación', unit: '€', max: 1000 },
  { key: 'sell_fixed', group: 'Venta', label: 'Fija por operación', unit: '€', max: 1000 },
  { key: 'sell_rate', group: 'Venta', label: 'Porcentaje', unit: '%', max: 10 },
  { key: 'sell_min', group: 'Venta', label: 'Mínimo por operación', unit: '€', max: 1000 },
  { key: 'fx_rate', group: 'Otros', label: 'Cambio de divisa', unit: '%', max: 10 },
  { key: 'custody_rate', group: 'Otros', label: 'Custodia anual', unit: '% / año', max: 10 },
  { key: 'maintenance', group: 'Otros', label: 'Mantenimiento', unit: '€ / año', max: 10000 },
]

export const EMPTY_CUSTOM = Object.fromEntries(CUSTOM_FIELDS.map(f => [f.key, '']))

export const MARKET_LABEL = {
  ES: 'Bolsa española',
  EUROZONE: 'Zona euro',
  US: 'EE. UU.',
  UK: 'Reino Unido',
  SE: 'Suecia',
  OTHER: 'Otros mercados',
}

/** «0,25» | «0.25» | «» -> número (vacío = 0). Devuelve null si no es un número válido. */
export function parseAmount(raw) {
  const s = String(raw ?? '').trim().replace(/\s/g, '').replace(',', '.')
  if (s === '') return 0
  if (!/^\d*\.?\d+$|^\d+\.$/.test(s)) return null
  return Number(s)
}

/** Valida el formulario. Devuelve { values, errors } con valores numéricos para la API. */
export function parseCustom(form) {
  const values = {}
  const errors = {}
  for (const f of CUSTOM_FIELDS) {
    const v = parseAmount(form?.[f.key])
    if (v == null) errors[f.key] = 'Introduce un número (p. ej. 0,25).'
    else if (v < 0 || v > f.max) errors[f.key] = `Entre 0 y ${f.max.toLocaleString('es-ES')} ${f.unit}.`
    else values[f.key] = v
  }
  return { values, errors, valid: Object.keys(errors).length === 0 }
}

/** Filas del desglose «Costes durante la inversión» (las de 0 € también: el cero es informativo). */
export function duringRows(c) {
  const periodic = c.trades?.periodic ?? 0
  return [
    { key: 'buy', label: 'Compras iniciales', value: c.during.buy_initial ?? c.during.buy },
    ...(periodic > 0
      ? [{ key: 'buy_periodic', label: `Compras periódicas (${periodic})`, value: c.during.buy_periodic }]
      : []),
    { key: 'fx', label: 'Cambio de divisa (compra)', value: c.during.fx },
    { key: 'custody', label: 'Custodia', value: c.during.custody },
    { key: 'maintenance', label: 'Mantenimiento', value: c.during.maintenance },
  ]
}

export function exitRows(c) {
  return [
    { key: 'sell', label: 'Ventas', value: c.exit.sell },
    { key: 'fx', label: 'Cambio de divisa (venta)', value: c.exit.fx },
  ]
}

/** Grupos del selector de intermediario (sin orden de preferencia). */
export const CATEGORY_LABEL = { bank: 'Bancos tradicionales', digital: 'Brokers y bancos digitales' }

export function groupBrokers(brokers) {
  return Object.keys(CATEGORY_LABEL).map(cat => ({
    key: cat,
    label: CATEGORY_LABEL[cat],
    items: brokers.filter(b => b.category === cat),
  })).filter(g => g.items.length > 0)
}

/** Escala común de las barras de impacto: siempre desde 0 (no se exageran diferencias pequeñas). */
export function barWidth(value, max) {
  if (!max || max <= 0 || value == null) return 0
  return Math.max(0, Math.min(100, (value / max) * 100))
}

/** «2026-11-12» -> «12/11/2026»; «2023-04» -> «04/2023». */
export function formatSourceDate(iso) {
  if (!iso) return null
  const [y, m, d] = String(iso).split('-')
  return d ? `${d}/${m}/${y}` : `${m}/${y}`
}

const browserStorage = () => (typeof localStorage === 'undefined' ? null : localStorage)

export function loadCostState(storage = browserStorage()) {
  try {
    const raw = JSON.parse(storage.getItem(KEY) || 'null')
    if (!raw || typeof raw !== 'object') return null
    const range = raw.range && (raw.range.period || (raw.range.start && raw.range.end)) ? raw.range : { period: '5Y' }
    return {
      selected: Array.isArray(raw.selected) ? raw.selected.filter(x => typeof x === 'string') : null,
      range,
      scenario: typeof raw.scenario === 'string' ? raw.scenario : null,
      custom: { ...EMPTY_CUSTOM, ...(raw.custom && typeof raw.custom === 'object' ? raw.custom : {}) },
      focus: typeof raw.focus === 'string' ? raw.focus : null,
    }
  } catch {
    return null
  }
}

export function saveCostState(state, storage = browserStorage()) {
  try {
    storage.setItem(KEY, JSON.stringify(state))
  } catch { /* almacenamiento no disponible: no se recuerda la configuración */ }
}
