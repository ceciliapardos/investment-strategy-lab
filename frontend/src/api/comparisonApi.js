import axios from 'axios'

/** Convierte las estrategias del Strategy Builder al formato de la API (sin copiar ni transformar datos). */
export function toApiStrategy(s) {
  return {
    id: s.id,
    name: s.name,
    initialCapital: s.initialCapital,
    baseCurrency: s.baseCurrency || 'EUR',
    assets: s.assets.map(a => ({ ticker: a.ticker, weight: a.weight })),
    recurringContributions: (s.recurringContributions || []).map(c => ({
      id: c.id, ticker: c.ticker, amount: c.amount, frequency: c.frequency,
    })),
  }
}

/**
 * Backtest histórico de varias estrategias.
 * range = { period: '5Y' } | { start: 'AAAA-MM-DD', end: 'AAAA-MM-DD' }
 */
export async function runBacktest(strategies, range, signal, benchmark = '') {
  const body = {
    strategies: strategies.map(toApiStrategy),
    ...(range.start ? { start: range.start, end: range.end } : { period: range.period }),
    ...(benchmark ? { benchmark } : {}),
  }
  const { data } = await axios.post('/api/comparison/backtest', body, { signal })
  return data
}

/** Índices de referencia disponibles (serie usada y qué representa). */
export async function getBenchmarks(signal) {
  const { data } = await axios.get('/api/comparison/benchmarks', { signal })
  return data.benchmarks
}
