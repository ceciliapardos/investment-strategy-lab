import { describe, expect, it } from 'vitest'
import {
  EMPTY_CUSTOM, barWidth, duringRows, exitRows, formatSourceDate, loadCostState, parseAmount, parseCustom, saveCostState,
} from './model'

describe('parseAmount', () => {
  it('acepta coma o punto decimal y vacío = 0', () => {
    expect(parseAmount('0,25')).toBe(0.25)
    expect(parseAmount('0.25')).toBe(0.25)
    expect(parseAmount('')).toBe(0)
    expect(parseAmount(' 3 ')).toBe(3)
    expect(parseAmount('5.')).toBe(5)
  })
  it('rechaza texto y negativos', () => {
    expect(parseAmount('abc')).toBeNull()
    expect(parseAmount('-1')).toBeNull()
    expect(parseAmount('1,2,3')).toBeNull()
  })
})

describe('parseCustom', () => {
  it('formulario vacío es válido y vale cero', () => {
    const r = parseCustom(EMPTY_CUSTOM)
    expect(r.valid).toBe(true)
    expect(Object.values(r.values).every(v => v === 0)).toBe(true)
  })
  it('valida límites', () => {
    const r = parseCustom({ ...EMPTY_CUSTOM, buy_rate: '25', fx_rate: 'x' })
    expect(r.valid).toBe(false)
    expect(r.errors.buy_rate).toMatch(/Entre 0 y 10/)
    expect(r.errors.fx_rate).toMatch(/número/)
  })
})

describe('desglose', () => {
  const c = { during: { buy: 3, fx: 50, custody: 10, maintenance: 0, total: 63 }, exit: { sell: 3, fx: 51, total: 54 } }
  it('separa costes durante y de salida', () => {
    expect(duringRows(c).map(r => r.value)).toEqual([3, 50, 10, 0])
    expect(exitRows(c).map(r => r.value)).toEqual([3, 51])
  })
})

describe('barWidth', () => {
  it('escala desde cero y no exagera diferencias pequeñas', () => {
    expect(barWidth(10000, 10000)).toBe(100)
    expect(barWidth(9990, 10000)).toBeCloseTo(99.9)
    expect(barWidth(0, 10000)).toBe(0)
    expect(barWidth(5, 0)).toBe(0)
  })
})

describe('formatSourceDate', () => {
  it('formatea fechas completas y mes/año', () => {
    expect(formatSourceDate('2026-11-12')).toBe('12/11/2026')
    expect(formatSourceDate('2023-04')).toBe('04/2023')
    expect(formatSourceDate(null)).toBeNull()
  })
})

function memoryStorage(initial = {}) {
  const data = { ...initial }
  return { getItem: k => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = String(v) } }
}

describe('almacenamiento', () => {
  it('recupera lo guardado y completa campos que falten', () => {
    const st = memoryStorage()
    saveCostState({ selected: ['a'], range: { period: '3Y' }, scenario: 'custom', custom: { buy_fixed: '1' }, focus: 'a' }, st)
    const s = loadCostState(st)
    expect(s.selected).toEqual(['a'])
    expect(s.range).toEqual({ period: '3Y' })
    expect(s.custom.buy_fixed).toBe('1')
    expect(s.custom.fx_rate).toBe('')
  })
  it('tolera datos corruptos', () => {
    expect(loadCostState(memoryStorage({ 'isl.costs': '{no json' }))).toBeNull()
  })
  it('sin almacenamiento disponible no falla', () => {
    expect(loadCostState(null)).toBeNull()
    expect(() => saveCostState({}, null)).not.toThrow()
  })
})
