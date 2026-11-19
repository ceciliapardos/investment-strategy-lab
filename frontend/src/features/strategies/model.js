/**
 * Modelo de datos de las estrategias (funciones PURAS, sin React ni red).
 *
 * Estrategia:
 *   {
 *     id: string,                 // identificador único e independiente
 *     name: string,               // 1-40 caracteres, único (sin distinguir mayúsculas)
 *     initialCapital: number|null,// capital inicial simulado (null = no válido / vacío)
 *     baseCurrency: 'EUR',        // divisa del capital (preparado para conversión futura)
 *     assets: [{
 *       ticker: string,           // p. ej. 'VOO'
 *       name: string,
 *       assetType: 'Stock'|'ETF'|'Index'|'Crypto'|'Future'|'Fund',
 *       currency: string,         // divisa de cotización del activo (p. ej. 'USD')
 *       exchange: string,
 *       weight: number|null,      // PESO OBJETIVO en % (12.5 = 12,5 %); null = vacío o texto
 *     }],
 *     recurringContributions: [{ // aportaciones periódicas opcionales (Fase 5.1)
 *       id: string,
 *       ticker: string,           // activo de la estrategia que compra cada aportación
 *       amount: number|null,      // euros por aportación
 *       frequency: 'monthly'|'quarterly'|'annual',
 *     }],
 *     createdAt: string, updatedAt: string  // ISO
 *   }
 *
 * initialCapital puede ser 0 solo si hay alguna aportación periódica.
 *
 * Los pesos se guardan en puntos porcentuales con un máximo de 2 decimales.
 * Las sumas se hacen en centésimas enteras para evitar errores de coma flotante
 * (0.1 + 0.2 ≠ 0.3 en JavaScript).
 */

export const SCHEMA_VERSION = 1
export const BASE_CURRENCY = 'EUR'
export const DEFAULT_CAPITAL = 10000

export const LIMITS = {
  maxStrategies: 20,
  maxAssets: 25,
  maxContributions: 25,
  nameMax: 40,
  capitalMax: 1_000_000_000, // 1.000 millones: suficiente y sin problemas de precisión
  contributionMax: 1_000_000,
  decimals: 2,
}

/** Frecuencias de aportación: mensual, trimestral y anual (ver Decisiones D51). */
export const FREQUENCIES = [
  { key: 'monthly', label: 'Mensual', per: 'al mes', perYear: 12 },
  { key: 'quarterly', label: 'Trimestral', per: 'al trimestre', perYear: 4 },
  { key: 'annual', label: 'Anual', per: 'al año', perYear: 1 },
]
export const FREQUENCY_KEYS = FREQUENCIES.map(f => f.key)
export const frequencyOf = key => FREQUENCIES.find(f => f.key === key)

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------
export function newId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

const nowIso = () => new Date().toISOString()
const norm = s => (s || '').trim().replace(/\s+/g, ' ')
const key = s => norm(s).toLocaleLowerCase('es-ES')
const hundredths = n => Math.round(n * 100)
const hasMaxDecimals = (n, d) => Math.abs(n * 10 ** d - Math.round(n * 10 ** d)) < 1e-7

/**
 * Convierte el texto de un campo numérico en número, aceptando formato español.
 *   "12,5" -> 12.5   "10.000" -> 10000   "10.000,50" -> 10000.5   "12.5" -> 12.5
 *   "1.000.000" -> 1000000   "50 %" -> 50   "10 000 €" -> 10000
 * Devuelve { value, error } con error = 'empty' | 'text' | null.
 */
export function parseNumber(raw) {
  if (typeof raw === 'number') return Number.isFinite(raw) ? { value: raw, error: null } : { value: null, error: 'text' }
  let s = String(raw ?? '').trim().replace(/[€%\s ]/g, '')
  if (s === '') return { value: null, error: 'empty' }
  if (s.includes('.') && s.includes(',')) {
    s = s.replace(/\./g, '').replace(',', '.')            // 10.000,50
  } else if (s.includes(',')) {
    s = s.replace(',', '.')                                // 12,5
  } else if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) {
    s = s.replace(/\./g, '')                               // 10.000 (miles)
  }
  if (!/^-?\d+(\.\d+)?$/.test(s)) return { value: null, error: 'text' }
  return { value: Number(s), error: null }
}

// ---------------------------------------------------------------------------
// Pesos
// ---------------------------------------------------------------------------
export const WEIGHT_MESSAGES = {
  empty: 'Introduce un peso.',
  text: 'El peso debe ser un número (p. ej. 25 o 12,5).',
  negative: 'El peso no puede ser negativo.',
  zero: 'Un peso de 0 % no aporta nada: asigna un peso o elimina el activo.',
  over100: 'Un activo no puede superar el 100 %.',
  decimals: 'Usa como máximo 2 decimales.',
}

/** Problema de un peso ya guardado (número o null), o null si es válido. */
export function weightIssue(weight) {
  if (weight == null) return 'empty'
  if (!Number.isFinite(weight)) return 'text'
  if (weight < 0) return 'negative'
  if (weight === 0) return 'zero'
  if (weight > 100) return 'over100'
  if (!hasMaxDecimals(weight, LIMITS.decimals)) return 'decimals'
  return null
}

/** Analiza el texto del campo de peso. value es null si no es un número. */
export function parseWeight(raw) {
  const { value, error } = parseNumber(raw)
  if (error) return { value: null, error }
  return { value, error: weightIssue(value) }
}

/**
 * Resumen de asignación de la estrategia.
 * status: 'empty' (sin activos) | 'under' (< 100 %) | 'exact' | 'over' (> 100 %)
 * Solo suman los pesos numéricos; los vacíos o con texto cuentan en invalidCount.
 */
export function allocation(strategy) {
  const assets = strategy?.assets || []
  let total = 0
  let invalidCount = 0
  for (const a of assets) {
    if (weightIssue(a.weight)) invalidCount += 1
    if (Number.isFinite(a.weight)) total += hundredths(a.weight)
  }
  const status = assets.length === 0 ? 'empty' : total === 10000 ? 'exact' : total < 10000 ? 'under' : 'over'
  return {
    total: total / 100,
    remaining: Math.max(0, 10000 - total) / 100,
    excess: Math.max(0, total - 10000) / 100,
    status,
    invalidCount,
  }
}

// ---------------------------------------------------------------------------
// Capital inicial
// ---------------------------------------------------------------------------
export const CAPITAL_MESSAGES = {
  empty: 'Introduce el capital inicial.',
  text: 'El capital debe ser un número (p. ej. 10.000 o 25000,50).',
  negative: 'El capital no puede ser negativo.',
  zero: 'El capital debe ser mayor que 0 €.',
  tooLarge: 'El máximo permitido es 1.000.000.000 €.',
  decimals: 'Usa como máximo 2 decimales (céntimos).',
}

export function capitalIssue(capital) {
  if (capital == null) return 'empty'
  if (!Number.isFinite(capital)) return 'text'
  if (capital < 0) return 'negative'
  if (capital === 0) return 'zero'
  if (capital > LIMITS.capitalMax) return 'tooLarge'
  if (!hasMaxDecimals(capital, 2)) return 'decimals'
  return null
}

export function parseCapital(raw) {
  const { value, error } = parseNumber(raw)
  if (error) return { value: null, error }
  return { value, error: capitalIssue(value) }
}

// ---------------------------------------------------------------------------
// Nombres
// ---------------------------------------------------------------------------
export const NAME_MESSAGES = {
  empty: 'El nombre no puede estar vacío.',
  tooLong: `El nombre puede tener como máximo ${LIMITS.nameMax} caracteres.`,
  duplicate: 'Ya tienes una estrategia con ese nombre.',
}

/** Valida un nombre. selfId permite que una estrategia conserve su propio nombre. */
export function validateName(raw, strategies = [], selfId = null) {
  const value = norm(raw)
  if (!value) return { value, error: 'empty' }
  if (value.length > LIMITS.nameMax) return { value, error: 'tooLong' }
  if (strategies.some(s => s.id !== selfId && key(s.name) === key(value))) return { value, error: 'duplicate' }
  return { value, error: null }
}

/** "Estrategia A", "Estrategia B", ... (la primera letra libre). */
export function nextDefaultName(strategies = []) {
  const used = new Set(strategies.map(s => key(s.name)))
  for (let i = 0; i < 26; i++) {
    const name = `Estrategia ${String.fromCharCode(65 + i)}`
    if (!used.has(key(name))) return name
  }
  let n = 27
  while (used.has(key(`Estrategia ${n}`))) n++
  return `Estrategia ${n}`
}

/** "X — copia", "X — copia 2", ... sin superar la longitud máxima. */
export function copyName(name, strategies = []) {
  const used = new Set(strategies.map(s => key(s.name)))
  for (let i = 1; i < 1000; i++) {
    const suffix = i === 1 ? ' — copia' : ` — copia ${i}`
    const base = norm(name).slice(0, LIMITS.nameMax - suffix.length).trimEnd()
    const candidate = base + suffix
    if (!used.has(key(candidate))) return candidate
  }
  return nextDefaultName(strategies)
}

// ---------------------------------------------------------------------------
// Operaciones sobre estrategias (devuelven objetos nuevos; no mutan)
// ---------------------------------------------------------------------------
export function createStrategy(strategies = [], name) {
  const t = nowIso()
  return {
    id: newId(),
    name: name ? norm(name) : nextDefaultName(strategies),
    initialCapital: DEFAULT_CAPITAL,
    baseCurrency: BASE_CURRENCY,
    assets: [],
    recurringContributions: [],
    createdAt: t,
    updatedAt: t,
  }
}

export function duplicateStrategy(strategy, strategies = []) {
  const t = nowIso()
  return {
    ...strategy,
    id: newId(),
    name: copyName(strategy.name, strategies),
    assets: strategy.assets.map(a => ({ ...a })),
    recurringContributions: contributionsOf(strategy).map(c => ({ ...c, id: newId() })),
    createdAt: t,
    updatedAt: t,
  }
}

const touch = s => ({ ...s, updatedAt: nowIso() })

export function renameStrategy(strategy, name) {
  return touch({ ...strategy, name: norm(name) })
}

export function setCapital(strategy, capital) {
  return touch({ ...strategy, initialCapital: capital })
}

export const ADD_ASSET_MESSAGES = {
  duplicate: ticker => `${ticker} ya forma parte de esta estrategia.`,
  limit: () => `Una estrategia puede tener como máximo ${LIMITS.maxAssets} activos.`,
}

/** Añade un activo con peso vacío. Devuelve { strategy, error }. */
export function addAsset(strategy, asset) {
  const ticker = (asset.ticker || '').toUpperCase()
  if (strategy.assets.some(a => a.ticker.toUpperCase() === ticker)) return { strategy, error: 'duplicate' }
  if (strategy.assets.length >= LIMITS.maxAssets) return { strategy, error: 'limit' }
  const row = {
    ticker,
    name: asset.name || ticker,
    assetType: asset.assetType || asset.type,
    currency: asset.currency || '',
    exchange: asset.exchange || '',
    weight: asset.weight ?? null,
  }
  return { strategy: touch({ ...strategy, assets: [...strategy.assets, row] }), error: null }
}

/**
 * Elimina un activo. Los pesos restantes NO se redistribuyen.
 * Sus aportaciones periódicas también se eliminan: no pueden apuntar a un
 * activo que ya no está en la estrategia.
 */
export function removeAsset(strategy, ticker) {
  return touch({
    ...strategy,
    assets: strategy.assets.filter(a => a.ticker !== ticker),
    recurringContributions: contributionsOf(strategy).filter(c => c.ticker !== ticker),
  })
}

// ---------------------------------------------------------------------------
// Aportaciones periódicas (opcionales)
// ---------------------------------------------------------------------------
export const contributionsOf = strategy => strategy?.recurringContributions || []

export const CONTRIBUTION_MESSAGES = {
  empty: 'Introduce un importe.',
  text: 'El importe debe ser un número (p. ej. 300 o 150,50).',
  negative: 'El importe no puede ser negativo.',
  zero: 'Una aportación de 0 € no hace nada: pon un importe o elimínala.',
  tooLarge: 'El máximo por aportación es 1.000.000 €.',
  decimals: 'Usa como máximo 2 decimales (céntimos).',
  orphan: 'Este activo ya no forma parte de la estrategia.',
  frequency: 'Elige una frecuencia.',
  duplicate: 'Ya hay otra aportación con este activo y esta frecuencia.',
}

export const ADD_CONTRIBUTION_MESSAGES = {
  noAssets: 'Añade primero algún activo: cada aportación compra un activo de la estrategia.',
  limit: () => `Una estrategia puede tener como máximo ${LIMITS.maxContributions} aportaciones.`,
}

export function amountIssue(amount) {
  if (amount == null) return 'empty'
  if (!Number.isFinite(amount)) return 'text'
  if (amount < 0) return 'negative'
  if (amount === 0) return 'zero'
  if (amount > LIMITS.contributionMax) return 'tooLarge'
  if (!hasMaxDecimals(amount, 2)) return 'decimals'
  return null
}

export function parseAmount(raw) {
  const { value, error } = parseNumber(raw)
  if (error) return { value: null, error }
  return { value, error: amountIssue(value) }
}

/** Problema de una aportación dentro de su estrategia, o null si es válida. */
export function contributionIssue(c, strategy) {
  if (!strategy.assets.some(a => a.ticker === c.ticker)) return 'orphan'
  if (!FREQUENCY_KEYS.includes(c.frequency)) return 'frequency'
  const issue = amountIssue(c.amount)
  if (issue) return issue
  const twin = contributionsOf(strategy).find(o => o.id !== c.id && o.ticker === c.ticker && o.frequency === c.frequency)
  if (twin) return 'duplicate'
  return null
}

/** Añade una aportación al primer activo (o al indicado), mensual y con importe vacío. */
export function addContribution(strategy, { ticker, amount = null, frequency = 'monthly' } = {}) {
  if (strategy.assets.length === 0) return { strategy, error: 'noAssets' }
  if (contributionsOf(strategy).length >= LIMITS.maxContributions) return { strategy, error: 'limit' }
  const c = { id: newId(), ticker: ticker || strategy.assets[0].ticker, amount, frequency }
  return { strategy: touch({ ...strategy, recurringContributions: [...contributionsOf(strategy), c] }), error: null, id: c.id }
}

export function updateContribution(strategy, id, patch) {
  return touch({
    ...strategy,
    recurringContributions: contributionsOf(strategy).map(c => (c.id === id ? { ...c, ...patch } : c)),
  })
}

export function removeContribution(strategy, id) {
  return touch({ ...strategy, recurringContributions: contributionsOf(strategy).filter(c => c.id !== id) })
}

/** Total aportado al año según las aportaciones válidas (orientativo). */
export function yearlyContributions(strategy) {
  return contributionsOf(strategy)
    .filter(c => !contributionIssue(c, strategy))
    .reduce((sum, c) => sum + c.amount * frequencyOf(c.frequency).perYear, 0)
}

export function setWeight(strategy, ticker, weight) {
  return touch({
    ...strategy,
    assets: strategy.assets.map(a => (a.ticker === ticker ? { ...a, weight } : a)),
  })
}

/**
 * Estado global de una estrategia: válida solo si tiene activos, todos los
 * pesos son válidos, suman exactamente 100 % y el capital es válido.
 */
export function strategyStatus(strategy) {
  const alloc = allocation(strategy)
  const issues = []
  if (alloc.status === 'empty') issues.push('Añade al menos un activo.')
  if (alloc.invalidCount > 0) {
    issues.push(alloc.invalidCount === 1 ? 'Hay 1 peso no válido.' : `Hay ${alloc.invalidCount} pesos no válidos.`)
  }
  if (alloc.status === 'under') issues.push(`Faltan ${fmtPct(alloc.remaining)} por asignar.`)
  if (alloc.status === 'over') issues.push(`Sobran ${fmtPct(alloc.excess)}.`)
  const contribs = contributionsOf(strategy)
  const badContribs = contribs.filter(c => contributionIssue(c, strategy)).length
  const capIssue = capitalIssue(strategy.initialCapital)
  if (capIssue === 'zero' && contribs.length === 0) {
    issues.push('Sin capital inicial necesitas al menos una aportación periódica.')
  } else if (capIssue && capIssue !== 'zero') {
    issues.push('El capital inicial no es válido.')
  }
  if (badContribs > 0) {
    issues.push(badContribs === 1 ? 'Hay 1 aportación periódica no válida.' : `Hay ${badContribs} aportaciones periódicas no válidas.`)
  }
  return { valid: issues.length === 0, issues, allocation: alloc }
}

export function currenciesOf(strategy) {
  return [...new Set(strategy.assets.map(a => a.currency).filter(Boolean))]
}

export function fmtPct(n) {
  return `${n.toLocaleString('es-ES', { maximumFractionDigits: 2 })} %`
}
