import axios from 'axios'
import { toApiStrategy } from './comparisonApi'

/** Sensibilidad a costes: simulación educativa hipotética (separada del backtest histórico). */
export async function getSensitivity(params, signal) {
  const { data } = await axios.post('/api/costs/sensitivity', params, { signal })
  return data
}

/** Intermediarios del dataset versionado (con fuente y fecha de consulta). */
export async function getBrokers(signal) {
  const { data } = await axios.get('/api/costs/brokers', { signal })
  return data
}

/**
 * Costes de intermediación de 1 a 6 estrategias sobre el backtest histórico.
 * Devuelve todos los escenarios: sin costes, cada intermediario y el personalizado.
 * range = { period: '5Y' } | { start, end };  custom = { buy_fixed, buy_rate, ... } (porcentajes en %)
 */
export async function analyzeCosts(strategies, range, custom, signal) {
  const body = {
    strategies: strategies.map(toApiStrategy),
    ...(range.start ? { start: range.start, end: range.end } : { period: range.period }),
    custom,
  }
  const { data } = await axios.post('/api/costs/analyze', body, { signal })
  return data
}
