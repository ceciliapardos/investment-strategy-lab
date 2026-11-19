import { describe, expect, it } from 'vitest'
import {
  FAVORITES_KEY, MAX_FAVORITES, addFavorite, isFavorite, loadFavorites, removeFavorite, saveFavorites, toggleFavorite,
} from './favorites'

function memoryStorage(initial = {}) {
  const data = { ...initial }
  return { data, getItem: k => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = String(v) } }
}

const VOO = { ticker: 'VOO', name: 'Vanguard S&P 500 ETF', type: 'ETF' }

describe('Mi lista (favoritos)', () => {
  it('lista vacía al empezar', () => {
    expect(loadFavorites(memoryStorage())).toEqual([])
  })

  it('añadir y eliminar', () => {
    let items = addFavorite([], VOO, 't')
    expect(items).toEqual([{ ticker: 'VOO', name: 'Vanguard S&P 500 ETF', type: 'ETF', addedAt: 't' }])
    expect(isFavorite(items, 'voo')).toBe(true)
    items = removeFavorite(items, 'VOO')
    expect(items).toEqual([])
  })

  it('ticker duplicado (también en minúsculas) no se repite', () => {
    let items = addFavorite([], VOO)
    items = addFavorite(items, { ...VOO, ticker: 'voo' })
    expect(items).toHaveLength(1)
  })

  it('toggle añade y quita', () => {
    const once = toggleFavorite([], VOO)
    expect(once).toHaveLength(1)
    expect(toggleFavorite(once, VOO)).toHaveLength(0)
  })

  it('persistencia: se guarda y se recupera tal cual (recargar o volver a abrir el navegador)', () => {
    const st = memoryStorage()
    const items = addFavorite(addFavorite([], VOO, 'a'), { ticker: 'SAN.MC', name: 'Banco Santander', type: 'Stock' }, 'b')
    expect(saveFavorites(items, st)).toBe(true)
    expect(JSON.parse(st.data[FAVORITES_KEY]).version).toBe(1)
    expect(loadFavorites(st)).toEqual(items)
  })

  it('datos dañados o duplicados al cargar se limpian', () => {
    expect(loadFavorites(memoryStorage({ [FAVORITES_KEY]: '{roto' }))).toEqual([])
    const st = memoryStorage({ [FAVORITES_KEY]: JSON.stringify({ items: [{ ticker: 'voo' }, { ticker: 'VOO' }, { name: 'sin ticker' }] }) })
    expect(loadFavorites(st).map(f => f.ticker)).toEqual(['VOO'])
  })

  it('límite máximo', () => {
    let items = []
    for (let i = 0; i < MAX_FAVORITES + 5; i++) items = addFavorite(items, { ticker: `T${i}` })
    expect(items).toHaveLength(MAX_FAVORITES)
  })
})
