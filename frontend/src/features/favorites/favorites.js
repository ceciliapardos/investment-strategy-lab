/**
 * «Mi lista»: activos favoritos de Explore Markets (funciones PURAS + localStorage).
 *
 * Formato guardado (clave 'isl.favorites'):
 *   { version: 1, items: [{ ticker, name, type, addedAt }] }
 * Solo en este navegador: sin usuarios ni servidor. No es una watchlist de
 * trading: sin alertas, precios objetivo ni órdenes.
 */
export const FAVORITES_KEY = 'isl.favorites'
export const MAX_FAVORITES = 50

const norm = t => String(t || '').trim().toUpperCase()

export function isFavorite(items, ticker) {
  return items.some(f => f.ticker === norm(ticker))
}

/** Añade un activo (sin duplicados; los más recientes primero). */
export function addFavorite(items, asset, now = new Date().toISOString()) {
  const ticker = norm(asset?.ticker)
  if (!ticker || isFavorite(items, ticker)) return items
  const item = { ticker, name: asset.name || ticker, type: asset.type || null, addedAt: now }
  return [item, ...items].slice(0, MAX_FAVORITES)
}

export function removeFavorite(items, ticker) {
  return items.filter(f => f.ticker !== norm(ticker))
}

export function toggleFavorite(items, asset) {
  return isFavorite(items, asset?.ticker) ? removeFavorite(items, asset.ticker) : addFavorite(items, asset)
}

const browserStorage = () => (typeof localStorage === 'undefined' ? null : localStorage)

export function loadFavorites(storage = browserStorage()) {
  try {
    const raw = JSON.parse(storage.getItem(FAVORITES_KEY) || 'null')
    if (!raw || !Array.isArray(raw.items)) return []
    const seen = new Set()
    const out = []
    for (const f of raw.items) {
      const ticker = norm(f?.ticker)
      if (!ticker || seen.has(ticker)) continue
      seen.add(ticker)
      out.push({ ticker, name: typeof f.name === 'string' ? f.name : ticker, type: typeof f.type === 'string' ? f.type : null,
                 addedAt: typeof f.addedAt === 'string' ? f.addedAt : null })
    }
    return out.slice(0, MAX_FAVORITES)
  } catch {
    return []
  }
}

export function saveFavorites(items, storage = browserStorage()) {
  try {
    storage.setItem(FAVORITES_KEY, JSON.stringify({ version: 1, items }))
    return true
  } catch {
    return false
  }
}
