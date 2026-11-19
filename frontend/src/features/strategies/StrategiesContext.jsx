/**
 * Estado compartido de las estrategias (React Context + useReducer).
 *
 * Cualquier módulo (p. ej. Strategy Comparison) puede leerlas con:
 *     const { strategies } = useStrategies()
 *
 * El estado se guarda en localStorage tras cada cambio (ver storage.js).
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from 'react'
import * as M from './model'
import { loadState, saveState } from './storage'

const StrategiesContext = createContext(null)

function replace(strategies, updated) {
  return strategies.map(s => (s.id === updated.id ? updated : s))
}

function reducer(state, action) {
  switch (action.type) {
    case 'add':
      return { ...state, strategies: [...state.strategies, action.strategy], activeId: action.strategy.id }
    case 'update':
      return { ...state, strategies: replace(state.strategies, action.strategy) }
    case 'remove': {
      const idx = state.strategies.findIndex(s => s.id === action.id)
      const strategies = state.strategies.filter(s => s.id !== action.id)
      let activeId = state.activeId
      if (activeId === action.id) activeId = (strategies[idx] || strategies[idx - 1] || null)?.id ?? null
      return { ...state, strategies, activeId }
    }
    case 'select':
      return state.strategies.some(s => s.id === action.id) ? { ...state, activeId: action.id } : state
    default:
      return state
  }
}

export function StrategiesProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, () => loadState())

  useEffect(() => {
    saveState(state)
  }, [state])

  const find = useCallback(id => state.strategies.find(s => s.id === id), [state.strategies])

  const actions = useMemo(() => ({
    /** Crea una estrategia y la selecciona. Devuelve su id o null si se alcanzó el límite. */
    create() {
      if (state.strategies.length >= M.LIMITS.maxStrategies) return null
      const s = M.createStrategy(state.strategies)
      dispatch({ type: 'add', strategy: s })
      return s.id
    },
    duplicate(id) {
      const src = find(id)
      if (!src || state.strategies.length >= M.LIMITS.maxStrategies) return null
      const copy = M.duplicateStrategy(src, state.strategies)
      dispatch({ type: 'add', strategy: copy })
      return copy.id
    },
    remove(id) {
      dispatch({ type: 'remove', id })
    },
    select(id) {
      dispatch({ type: 'select', id })
    },
    /** Devuelve el código de error de validación o null si se ha renombrado. */
    rename(id, name) {
      const src = find(id)
      if (!src) return 'empty'
      const { value, error } = M.validateName(name, state.strategies, id)
      if (error) return error
      dispatch({ type: 'update', strategy: M.renameStrategy(src, value) })
      return null
    },
    setCapital(id, capital) {
      const src = find(id)
      if (src) dispatch({ type: 'update', strategy: M.setCapital(src, capital) })
    },
    /** Devuelve 'duplicate' | 'limit' | null. */
    addAsset(id, asset) {
      const src = find(id)
      if (!src) return null
      const { strategy, error } = M.addAsset(src, asset)
      if (!error) dispatch({ type: 'update', strategy })
      return error
    },
    removeAsset(id, ticker) {
      const src = find(id)
      if (src) dispatch({ type: 'update', strategy: M.removeAsset(src, ticker) })
    },
    setWeight(id, ticker, weight) {
      const src = find(id)
      if (src) dispatch({ type: 'update', strategy: M.setWeight(src, ticker, weight) })
    },
    /** Devuelve 'noAssets' | 'limit' | null. */
    addContribution(id, contribution) {
      const src = find(id)
      if (!src) return null
      const { strategy, error } = M.addContribution(src, contribution)
      if (!error) dispatch({ type: 'update', strategy })
      return error
    },
    updateContribution(id, contributionId, patch) {
      const src = find(id)
      if (src) dispatch({ type: 'update', strategy: M.updateContribution(src, contributionId, patch) })
    },
    removeContribution(id, contributionId) {
      const src = find(id)
      if (src) dispatch({ type: 'update', strategy: M.removeContribution(src, contributionId) })
    },
  }), [state.strategies, find])

  const value = useMemo(() => ({
    strategies: state.strategies,
    activeId: state.activeId,
    active: state.strategies.find(s => s.id === state.activeId) || null,
    storageWarning: state.warning,
    ...actions,
  }), [state, actions])

  return <StrategiesContext.Provider value={value}>{children}</StrategiesContext.Provider>
}

export function useStrategies() {
  const ctx = useContext(StrategiesContext)
  if (!ctx) throw new Error('useStrategies debe usarse dentro de <StrategiesProvider>')
  return ctx
}
