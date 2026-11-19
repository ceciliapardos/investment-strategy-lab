import { describe, expect, it } from 'vitest'
import { createStrategy, LIMITS } from './model'
import { loadState, saveState, STORAGE_KEY } from './storage'

function memoryStorage(initial = {}) {
  const data = { ...initial }
  return {
    data,
    getItem: k => (k in data ? data[k] : null),
    setItem: (k, v) => { data[k] = String(v) },
  }
}

describe('persistencia en localStorage', () => {
  it('guarda y vuelve a cargar exactamente lo mismo', () => {
    const st = memoryStorage()
    const a = { ...createStrategy([]), assets: [{ ticker: 'VOO', name: 'Vanguard', assetType: 'ETF', currency: 'USD', exchange: 'NYSEArca', weight: 60 }] }
    const b = createStrategy([a])
    expect(saveState({ strategies: [a, b], activeId: b.id }, st)).toBe(true)
    expect(JSON.parse(st.data[STORAGE_KEY]).version).toBe(1)
    const loaded = loadState(st)
    expect(loaded).toEqual({ strategies: [a, b], activeId: b.id, warning: null })
  })

  it('primera visita: sin estrategias y sin aviso', () => {
    expect(loadState(memoryStorage())).toEqual({ strategies: [], activeId: null, warning: null })
  })

  it('datos dañados: se empieza de cero, con copia de seguridad y aviso', () => {
    const st = memoryStorage({ [STORAGE_KEY]: '{esto no es json' })
    const r = loadState(st)
    expect(r).toMatchObject({ strategies: [], warning: 'corrupt' })
    expect(st.data['isl.strategies.corrupt']).toBe('{esto no es json')
  })

  it('versión desconocida se trata como dañada', () => {
    const st = memoryStorage({ [STORAGE_KEY]: JSON.stringify({ version: 99, strategies: [] }) })
    expect(loadState(st).warning).toBe('corrupt')
  })

  it('limpia entradas inválidas, duplicados y valores no numéricos', () => {
    const good = createStrategy([])
    const raw = {
      version: 1,
      activeId: 'no-existe',
      strategies: [
        { ...good, initialCapital: 'mucho', assets: [
          { ticker: 'voo', weight: 50 }, { ticker: 'VOO', weight: 10 }, { ticker: '', weight: 5 }, { ticker: 'QQQ', weight: 'x' },
        ] },
        { ...good },                 // id repetido -> se descarta
        { id: 'sin-nombre' },        // incompleta -> se descarta
      ],
    }
    const r = loadState(memoryStorage({ [STORAGE_KEY]: JSON.stringify(raw) }))
    expect(r.strategies).toHaveLength(1)
    expect(r.activeId).toBe(good.id) // activeId inexistente -> primera estrategia
    expect(r.strategies[0].initialCapital).toBe(null)
    expect(r.strategies[0].assets.map(a => [a.ticker, a.weight])).toEqual([['VOO', 50], ['QQQ', null]])
  })

  it('respeta los límites al cargar', () => {
    const many = Array.from({ length: LIMITS.maxStrategies + 5 }, (_, i) => ({ ...createStrategy([]), name: `S${i}` }))
    const r = loadState(memoryStorage({ [STORAGE_KEY]: JSON.stringify({ version: 1, strategies: many }) }))
    expect(r.strategies).toHaveLength(LIMITS.maxStrategies)
  })

  it('si el navegador bloquea el almacenamiento, la app sigue funcionando', () => {
    const blocked = { getItem() { throw new Error('SecurityError') }, setItem() { throw new Error('QuotaExceeded') } }
    expect(loadState(blocked)).toMatchObject({ strategies: [], warning: 'unavailable' })
    expect(saveState({ strategies: [], activeId: null }, blocked)).toBe(false)
  })
})
