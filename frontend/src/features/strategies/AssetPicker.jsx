import { useEffect, useRef, useState } from 'react'
import SearchBar from '../../components/SearchBar'
import TypeBadge from '../../components/TypeBadge'
import { getErrorMessage, getQuote, isCancel, searchAssets } from '../../api/marketApi'
import { ADD_ASSET_MESSAGES } from './model'

/**
 * Buscador para añadir activos. Reutiliza la API de Explore Markets:
 * - searchAssets: misma búsqueda y misma clasificación de tipos.
 * - getQuote: al añadir, obtiene la divisa (la búsqueda de Yahoo no la da)
 *   y confirma que el activo existe y está soportado.
 */
export default function AssetPicker({ strategy, onAdd }) {
  const [results, setResults] = useState([])
  const [status, setStatus] = useState('idle') // idle | loading | done | error
  const [query, setQuery] = useState('')
  const [adding, setAdding] = useState(null)
  const [message, setMessage] = useState(null) // { tone: 'ok'|'warn'|'error', text }
  const ctrl = useRef(null)

  useEffect(() => () => ctrl.current?.abort(), [])
  // Al cambiar de estrategia se limpia el mensaje (los resultados se conservan).
  useEffect(() => { setMessage(null) }, [strategy.id])

  async function search(q) {
    ctrl.current?.abort()
    const c = new AbortController()
    ctrl.current = c
    setQuery(q)
    setStatus('loading')
    setMessage(null)
    try {
      const data = await searchAssets(q, c.signal)
      setResults(data.results || [])
      setStatus('done')
    } catch (err) {
      if (isCancel(err)) return
      setResults([])
      setStatus('error')
      setMessage({ tone: 'error', text: getErrorMessage(err) })
    }
  }

  const inStrategy = ticker => strategy.assets.some(a => a.ticker === ticker)

  async function add(result) {
    if (inStrategy(result.ticker)) {
      setMessage({ tone: 'warn', text: ADD_ASSET_MESSAGES.duplicate(result.ticker) })
      return
    }
    setAdding(result.ticker)
    setMessage(null)
    try {
      const q = await getQuote(result.ticker)
      const err = onAdd({ ticker: q.ticker, name: q.name, assetType: q.type, currency: q.currency, exchange: q.exchange })
      if (err) setMessage({ tone: 'warn', text: ADD_ASSET_MESSAGES[err](q.ticker) })
      else setMessage({ tone: 'ok', text: `${q.ticker} añadido. Ahora asígnale un peso.` })
    } catch (err) {
      setMessage({ tone: 'error', text: getErrorMessage(err) })
    } finally {
      setAdding(null)
    }
  }

  return (
    <div className="sb-picker">
      <SearchBar
        variant="light"
        onSearch={search}
        loading={status === 'loading'}
        placeholder="Añadir activo: ticker o nombre (VOO, Apple, S&P 500…)"
        ariaLabel="Buscar activo para añadir"
        buttonLabel="Buscar"
        testId="asset-search"
      />

      {message && (
        <p className={`notice notice--${message.tone === 'ok' ? 'info' : message.tone} sb-picker__msg`} role="status" data-testid="picker-message">
          {message.text}
        </p>
      )}

      {status === 'done' && results.length === 0 && (
        <p className="sb-picker__empty">No hay resultados para «{query}». Prueba con el ticker exacto.</p>
      )}

      {results.length > 0 && (
        <ul className="sb-picker__results" data-testid="picker-results">
          {results.map(r => {
            const added = inStrategy(r.ticker)
            return (
              <li key={r.ticker} className="sb-picker__row">
                <span className="sb-picker__id">
                  <span className="sb-picker__ticker">{r.ticker}</span>
                  <span className="sb-picker__name">{r.name}</span>
                </span>
                <TypeBadge type={r.type} size="sm" />
                <button
                  type="button"
                  className={`sb-picker__add ${added ? 'is-added' : ''}`}
                  onClick={() => add(r)}
                  disabled={adding === r.ticker}
                  aria-label={added ? `${r.ticker} ya está en la estrategia` : `Añadir ${r.ticker}`}
                  data-testid={`add-${r.ticker}`}
                >
                  {adding === r.ticker ? '…' : added ? '✓ Añadido' : '＋ Añadir'}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
