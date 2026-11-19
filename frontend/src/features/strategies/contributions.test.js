import { describe, expect, it } from 'vitest'
import {
  addAsset, addContribution, contributionIssue, createStrategy, duplicateStrategy, parseAmount,
  removeAsset, removeContribution, setCapital, setWeight, strategyStatus, updateContribution, yearlyContributions,
} from './model'
import { parseStored } from './storage'

function base() {
  let s = createStrategy([])
  s = addAsset(s, { ticker: 'VOO', name: 'Vanguard', assetType: 'ETF', currency: 'USD' }).strategy
  s = addAsset(s, { ticker: 'AAPL', name: 'Apple', assetType: 'Stock', currency: 'USD' }).strategy
  s = setWeight(s, 'VOO', 60)
  return setWeight(s, 'AAPL', 40)
}

describe('aportaciones periódicas', () => {
  it('son opcionales: una estrategia sin aportaciones sigue siendo válida', () => {
    expect(strategyStatus(base()).valid).toBe(true)
    expect(base().recurringContributions).toEqual([])
  })

  it('añadir, modificar y eliminar', () => {
    let { strategy: s, id } = addContribution(base(), { ticker: 'VOO', amount: 300 })
    expect(s.recurringContributions).toHaveLength(1)
    s = updateContribution(s, id, { amount: 250, frequency: 'quarterly' })
    expect(s.recurringContributions[0]).toMatchObject({ ticker: 'VOO', amount: 250, frequency: 'quarterly' })
    s = removeContribution(s, id)
    expect(s.recurringContributions).toEqual([])
  })

  it('sin activos no se puede añadir', () => {
    expect(addContribution(createStrategy([])).error).toBe('noAssets')
  })

  it('importe negativo, cero, vacío o texto', () => {
    expect(parseAmount('-5').error).toBe('negative')
    expect(parseAmount('0').error).toBe('zero')
    expect(parseAmount('').error).toBe('empty')
    expect(parseAmount('abc').error).toBe('text')
    expect(parseAmount('150,50').value).toBe(150.5)
    const s = addContribution(base(), { ticker: 'VOO', amount: null }).strategy
    expect(strategyStatus(s).valid).toBe(false)
    expect(strategyStatus(s).issues.join(' ')).toMatch(/aportación periódica no válida/)
  })

  it('activo inexistente o que ya no forma parte de la estrategia', () => {
    const s = { ...base(), recurringContributions: [{ id: 'x', ticker: 'TSLA', amount: 100, frequency: 'monthly' }] }
    expect(contributionIssue(s.recurringContributions[0], s)).toBe('orphan')
  })

  it('eliminar un activo elimina sus aportaciones', () => {
    const s = addContribution(base(), { ticker: 'AAPL', amount: 100 }).strategy
    expect(removeAsset(s, 'AAPL').recurringContributions).toEqual([])
  })

  it('varias aportaciones al mismo activo: válido con frecuencias distintas, duplicado si coinciden', () => {
    let s = addContribution(base(), { ticker: 'VOO', amount: 100, frequency: 'monthly' }).strategy
    s = addContribution(s, { ticker: 'VOO', amount: 1000, frequency: 'annual' }).strategy
    expect(strategyStatus(s).valid).toBe(true)
    s = addContribution(s, { ticker: 'VOO', amount: 50, frequency: 'monthly' }).strategy
    expect(contributionIssue(s.recurringContributions[2], s)).toBe('duplicate')
    expect(strategyStatus(s).valid).toBe(false)
  })

  it('capital inicial 0: válido solo con aportaciones', () => {
    const s = setCapital(base(), 0)
    expect(strategyStatus(s).valid).toBe(false)
    expect(strategyStatus(s).issues[0]).toMatch(/al menos una aportación/)
    const withC = addContribution(s, { ticker: 'VOO', amount: 300 }).strategy
    expect(strategyStatus(withC).valid).toBe(true)
  })

  it('total anual orientativo', () => {
    let s = addContribution(base(), { ticker: 'VOO', amount: 300, frequency: 'monthly' }).strategy
    s = addContribution(s, { ticker: 'AAPL', amount: 500, frequency: 'quarterly' }).strategy
    expect(yearlyContributions(s)).toBe(300 * 12 + 500 * 4)
  })

  it('duplicar copia las aportaciones con identificadores nuevos', () => {
    const s = addContribution(base(), { ticker: 'VOO', amount: 300 }).strategy
    const copy = duplicateStrategy(s, [s])
    expect(copy.recurringContributions[0].amount).toBe(300)
    expect(copy.recurringContributions[0].id).not.toBe(s.recurringContributions[0].id)
  })

  it('persistencia: se guardan y las estrategias antiguas sin el campo se cargan con []', () => {
    const s = addContribution(base(), { ticker: 'VOO', amount: 300, frequency: 'annual' }).strategy
    const old = { ...base() }
    delete old.recurringContributions
    const loaded = parseStored(JSON.stringify({ version: 1, activeId: s.id, strategies: [s, { ...old, id: 'old' }] }))
    expect(loaded.strategies[0].recurringContributions[0]).toMatchObject({ ticker: 'VOO', amount: 300, frequency: 'annual' })
    expect(loaded.strategies[1].recurringContributions).toEqual([])
  })
})
