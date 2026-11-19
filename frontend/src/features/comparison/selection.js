/**
 * Selección de estrategias a comparar y periodo, recordados en el navegador.
 * Las estrategias en sí siguen viviendo SOLO en el Strategy Builder.
 */
const KEY = 'isl.comparison'
export const MAX_SELECTED = 6

export const STRATEGY_COLORS = ['#4B5BF6', '#0E9F6E', '#F59E0B', '#EC4899', '#0EA5E9', '#8B5CF6']

export const COMPARISON_PRESETS = [
  { key: '1Y', label: '1A', title: '1 año' },
  { key: '3Y', label: '3A', title: '3 años' },
  { key: '5Y', label: '5A', title: '5 años' },
  { key: '10Y', label: '10A', title: '10 años' },
  { key: 'MAX', label: 'Máx. común', title: 'Todo el periodo en el que todos los activos tienen datos' },
]

export function loadSelection() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || 'null')
    if (!raw || !Array.isArray(raw.selected)) return null
    const range = raw.range && (raw.range.period || (raw.range.start && raw.range.end)) ? raw.range : { period: '5Y' }
    const benchmark = typeof raw.benchmark === 'string' ? raw.benchmark : ''
    return { selected: raw.selected.filter(x => typeof x === 'string'), range, benchmark }
  } catch {
    return null
  }
}

export function saveSelection(selected, range, benchmark = '') {
  try {
    localStorage.setItem(KEY, JSON.stringify({ selected, range, benchmark }))
  } catch { /* almacenamiento no disponible: no se recuerda la selección */ }
}
