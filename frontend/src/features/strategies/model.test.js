import { describe, expect, it } from 'vitest'
import * as M from './model'

const asset = (ticker, weight = null, extra = {}) => ({ ticker, name: ticker, assetType: 'ETF', currency: 'USD', exchange: '', weight, ...extra })
const withAssets = (...assets) => ({ ...M.createStrategy([]), assets })

describe('parseNumber (formato español)', () => {
  it.each([
    ['25', 25], ['12,5', 12.5], ['12.5', 12.5], ['10.000', 10000], ['1.000.000', 1000000],
    ['10.000,50', 10000.5], ['50 %', 50], ['10 000 €', 10000], ['-5', -5], ['0', 0],
  ])('%s -> %s', (raw, expected) => {
    expect(M.parseNumber(raw)).toEqual({ value: expected, error: null })
  })

  it.each([['', 'empty'], ['   ', 'empty'], ['abc', 'text'], ['12a', 'text'], ['1,2,3', 'text'], ['--5', 'text']])(
    '%j -> error %s', (raw, error) => {
      expect(M.parseNumber(raw)).toEqual({ value: null, error })
    })
})

describe('pesos', () => {
  it.each([
    ['50', 50, null], ['12,5', 12.5, null], ['0,01', 0.01, null], ['100', 100, null],
    ['', null, 'empty'], ['abc', null, 'text'], ['-10', -10, 'negative'], ['0', 0, 'zero'],
    ['100,01', 100.01, 'over100'], ['150', 150, 'over100'], ['33,333', 33.333, 'decimals'],
  ])('parseWeight(%j) -> %s / %s', (raw, value, error) => {
    expect(M.parseWeight(raw)).toEqual({ value, error })
  })

  it('cada error tiene un mensaje para el usuario', () => {
    for (const code of ['empty', 'text', 'negative', 'zero', 'over100', 'decimals']) {
      expect(M.WEIGHT_MESSAGES[code]).toBeTruthy()
    }
  })
})

describe('allocation (suma de pesos)', () => {
  it('sin activos', () => {
    expect(M.allocation(withAssets()).status).toBe('empty')
  })

  it('exactamente 100 % con decimales que en coma flotante no suman 100', () => {
    // 33.33 + 33.33 + 33.34 = 99.99999999999999 en JavaScript
    const a = M.allocation(withAssets(asset('A', 33.33), asset('B', 33.33), asset('C', 33.34)))
    expect(a).toMatchObject({ status: 'exact', total: 100, remaining: 0, excess: 0 })
  })

  it('0.1 + 0.2 + 99.7 = 100', () => {
    expect(M.allocation(withAssets(asset('A', 0.1), asset('B', 0.2), asset('C', 99.7))).status).toBe('exact')
  })

  it('menos de 100 %: indica lo que falta', () => {
    expect(M.allocation(withAssets(asset('A', 50), asset('B', 35)))).toMatchObject({ status: 'under', total: 85, remaining: 15 })
  })

  it('más de 100 %: indica el exceso', () => {
    expect(M.allocation(withAssets(asset('A', 60), asset('B', 48)))).toMatchObject({ status: 'over', total: 108, excess: 8 })
  })

  it('pesos vacíos o inválidos se cuentan aparte', () => {
    const a = M.allocation(withAssets(asset('A', 100), asset('B', null), asset('C', -5)))
    expect(a.invalidCount).toBe(2)
    expect(a.total).toBe(95) // el negativo es un número y se refleja en la suma
  })
})

describe('capital inicial', () => {
  it.each([
    ['10.000', 10000, null], ['50000', 50000, null], ['0,01', 0.01, null], ['1.000.000.000', 1e9, null],
    ['', null, 'empty'], ['diez mil', null, 'text'], ['-100', -100, 'negative'], ['0', 0, 'zero'],
    ['1.000.000.001', 1000000001, 'tooLarge'], ['99999999999999999999', 1e20, 'tooLarge'], ['10,555', 10.555, 'decimals'],
  ])('parseCapital(%j) -> %s / %s', (raw, value, error) => {
    expect(M.parseCapital(raw)).toEqual({ value, error })
  })
})

describe('nombres', () => {
  const list = [{ id: '1', name: 'Estrategia A' }, { id: '2', name: 'Cartera Tech' }]

  it('vacío, demasiado largo y duplicado (sin distinguir mayúsculas)', () => {
    expect(M.validateName('   ', list).error).toBe('empty')
    expect(M.validateName('x'.repeat(41), list).error).toBe('tooLong')
    expect(M.validateName('x'.repeat(40), list).error).toBe(null)
    expect(M.validateName('  cartera   TECH ', list).error).toBe('duplicate')
  })

  it('una estrategia puede conservar su propio nombre', () => {
    expect(M.validateName('Cartera Tech', list, '2')).toEqual({ value: 'Cartera Tech', error: null })
  })

  it('normaliza espacios', () => {
    expect(M.validateName('  Mi   estrategia  2035 ', list).value).toBe('Mi estrategia 2035')
  })

  it('nombres por defecto A, B, C… saltando los usados', () => {
    expect(M.nextDefaultName([])).toBe('Estrategia A')
    expect(M.nextDefaultName([{ name: 'Estrategia A' }, { name: 'estrategia b' }])).toBe('Estrategia C')
  })

  it('nombre de copia sin colisiones ni exceso de longitud', () => {
    const l = [{ name: 'Estrategia A' }, { name: 'Estrategia A — copia' }]
    expect(M.copyName('Estrategia A', l)).toBe('Estrategia A — copia 2')
    expect(M.copyName('x'.repeat(40), []).length).toBeLessThanOrEqual(M.LIMITS.nameMax)
  })
})

describe('operaciones', () => {
  it('crea estrategias con id único, capital por defecto y sin activos', () => {
    const a = M.createStrategy([])
    const b = M.createStrategy([a])
    expect(a.id).not.toBe(b.id)
    expect(b.name).toBe('Estrategia B')
    expect(a).toMatchObject({ initialCapital: M.DEFAULT_CAPITAL, baseCurrency: 'EUR', assets: [] })
  })

  it('añade activos con peso vacío e impide duplicados', () => {
    let s = M.createStrategy([])
    s = M.addAsset(s, { ticker: 'voo', name: 'Vanguard', type: 'ETF', currency: 'USD' }).strategy
    expect(s.assets[0]).toMatchObject({ ticker: 'VOO', assetType: 'ETF', currency: 'USD', weight: null })
    const again = M.addAsset(s, { ticker: 'VOO' })
    expect(again.error).toBe('duplicate')
    expect(again.strategy.assets).toHaveLength(1)
  })

  it('respeta el máximo de activos', () => {
    let s = M.createStrategy([])
    for (let i = 0; i < M.LIMITS.maxAssets; i++) s = M.addAsset(s, { ticker: `T${i}` }).strategy
    expect(M.addAsset(s, { ticker: 'EXTRA' }).error).toBe('limit')
  })

  it('eliminar un activo NO redistribuye los pesos restantes', () => {
    const s = withAssets(asset('A', 50), asset('B', 30), asset('C', 20))
    const r = M.removeAsset(s, 'B')
    expect(r.assets.map(a => [a.ticker, a.weight])).toEqual([['A', 50], ['C', 20]])
    expect(M.allocation(r)).toMatchObject({ status: 'under', remaining: 30 })
  })

  it('duplicar crea una copia independiente', () => {
    const s = withAssets(asset('A', 60), asset('B', 40))
    const copy = M.duplicateStrategy(s, [s])
    expect(copy.id).not.toBe(s.id)
    expect(copy.name).toBe(`${s.name} — copia`)
    expect(copy.assets).toEqual(s.assets)
    copy.assets[0].weight = 10
    expect(s.assets[0].weight).toBe(60) // no comparte referencias
  })

  it('las operaciones no mutan la estrategia original', () => {
    const s = withAssets(asset('A', 50))
    const frozen = JSON.stringify(s)
    M.setWeight(s, 'A', 70)
    M.setCapital(s, 5)
    M.renameStrategy(s, 'Otro')
    M.removeAsset(s, 'A')
    expect(JSON.stringify(s)).toBe(frozen)
  })
})

describe('strategyStatus', () => {
  it('válida solo con activos, pesos válidos que suman 100 % y capital válido', () => {
    const ok = withAssets(asset('A', 60), asset('B', 40))
    expect(M.strategyStatus(ok)).toMatchObject({ valid: true, issues: [] })
    expect(M.strategyStatus(withAssets()).valid).toBe(false)
    expect(M.strategyStatus({ ...ok, initialCapital: null }).issues).toContain('El capital inicial no es válido.')
    expect(M.strategyStatus(withAssets(asset('A', 60), asset('B', 30))).issues).toContain('Faltan 10 % por asignar.')
    expect(M.strategyStatus(withAssets(asset('A', 60), asset('B', 50))).issues).toContain('Sobran 10 %.')
    expect(M.strategyStatus(withAssets(asset('A', 100), asset('B', 0))).valid).toBe(false) // peso 0 no válido
  })

  it('lista las divisas de los activos', () => {
    const s = withAssets(asset('A', 50, { currency: 'USD' }), asset('B', 50, { currency: 'EUR' }), asset('C', 0, { currency: 'USD' }))
    expect(M.currenciesOf(s)).toEqual(['USD', 'EUR'])
  })
})
