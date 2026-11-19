/**
 * Formato numérico y de fechas único de la aplicación (es-ES).
 */
const LOCALE = 'es-ES'

export function formatPrice(value, decimals = 2) {
  if (value == null || Number.isNaN(value)) return '—'
  return value.toLocaleString(LOCALE, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

/** value expresado como FRACCIÓN (0.0003 -> "0,03 %"). */
export function formatFraction(value, { decimals = 2, signed = false } = {}) {
  if (value == null || Number.isNaN(value)) return '—'
  return new Intl.NumberFormat(LOCALE, {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    signDisplay: signed ? 'exceptZero' : 'auto',
  }).format(value)
}

export function formatTer(ter) {
  if (!ter) return '—'
  if (ter.status === 'not_applicable') return 'No aplica'
  if (ter.status === 'available') return formatFraction(ter.value, { decimals: 2 })
  return 'No disponible'
}

/** Fechas "AAAA-MM-DD" se interpretan a mediodía local para no cambiar de día. */
export function parseDay(isoDate) {
  if (!isoDate) return null
  const d = new Date(`${String(isoDate).slice(0, 10)}T12:00:00`)
  return Number.isNaN(d.getTime()) ? null : d
}

export function formatDay(isoDate, opts = { day: 'numeric', month: 'short', year: 'numeric' }) {
  const d = parseDay(isoDate)
  return d ? d.toLocaleDateString(LOCALE, opts) : '—'
}

export function formatDateTime(iso) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString(LOCALE, { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

/** "hace 5 min", "hace 3 h", "ayer", "12 nov". */
export function relativeTime(iso, now = new Date()) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const mins = Math.round((now - d) / 60000)
  if (mins < 1) return 'ahora'
  if (mins < 60) return `hace ${mins} min`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `hace ${hours} h`
  const days = Math.round(hours / 24)
  if (days === 1) return 'ayer'
  if (days < 7) return `hace ${days} días`
  return d.toLocaleDateString(LOCALE, { day: 'numeric', month: 'short' })
}

export function todayIso() {
  const d = new Date()
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export const ASSET_TYPE_LABEL = {
  Stock: 'Acción',
  ETF: 'ETF',
  Index: 'Índice',
  Crypto: 'Cripto',
  Future: 'Futuro',
  Fund: 'Fondo',
}
