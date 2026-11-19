import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import PageHero from '../components/PageHero'
import Mascot from '../components/Mascot'
import SearchBar from '../components/SearchBar'
import AssetCard from '../components/AssetCard'
import PeriodControls from '../components/PeriodControls'
import MetricsPanel from '../components/MetricsPanel'
import PerformanceChart from '../components/PerformanceChart'
import TypeBadge from '../components/TypeBadge'
import { searchAssets, getQuote, getPerformance, getTer, getErrorMessage, isCancel } from '../api/marketApi'
import { formatDay, formatPrice } from '../utils/format'
import { FavoriteButton, FavoritesList, useFavorites } from '../features/favorites/FavoritesUI'
import './ExploreMarkets.css'

const EXAMPLES = ['VOO', 'TSLA', 'SAN.MC', '^GSPC', 'BTC-USD']

/**
 * Explore Markets
 * - El activo seleccionado vive en la URL (?ticker=VOO).
 * - Las peticiones obsoletas se cancelan (cambios rápidos de activo o periodo).
 * - Métricas calculadas en el backend con cierres diarios ajustados.
 */
export default function ExploreMarkets() {
  const [searchParams, setSearchParams] = useSearchParams()
  const ticker = (searchParams.get('ticker') || '').trim().toUpperCase()

  // ---- Búsqueda ----
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searchStatus, setSearchStatus] = useState('idle') // idle | loading | done | error
  const [searchError, setSearchError] = useState(null)
  const searchCtrl = useRef(null)

  useEffect(() => () => searchCtrl.current?.abort(), [])

  const handleSearch = useCallback(async (q) => {
    searchCtrl.current?.abort()
    const ctrl = new AbortController()
    searchCtrl.current = ctrl
    setQuery(q)
    setSearchStatus('loading')
    setSearchError(null)
    setResults([])
    if (ticker) setSearchParams({}, { replace: true })
    try {
      const data = await searchAssets(q, ctrl.signal)
      setResults(data.results || [])
      setSearchStatus('done')
    } catch (err) {
      if (isCancel(err)) return
      setSearchError(getErrorMessage(err))
      setSearchStatus('error')
    }
  }, [ticker, setSearchParams])

  // ---- Ficha (precio + TER) ----
  const [detail, setDetail] = useState({ status: 'idle', quote: null, ter: null, error: null })

  useEffect(() => {
    if (!ticker) {
      setDetail({ status: 'idle', quote: null, ter: null, error: null })
      return
    }
    const ctrl = new AbortController()
    setDetail({ status: 'loading', quote: null, ter: null, error: null })
    const terPromise = getTer(ticker, ctrl.signal).catch(err => {
      if (isCancel(err)) throw err
      return null // el TER es secundario: si falla, la ficha se muestra igual
    })
    Promise.all([getQuote(ticker, ctrl.signal), terPromise])
      .then(([quote, ter]) => setDetail({ status: 'ready', quote, ter, error: null }))
      .catch(err => {
        if (isCancel(err)) return
        setDetail({ status: 'error', quote: null, ter: null, error: getErrorMessage(err) })
      })
    return () => ctrl.abort()
  }, [ticker])

  // ---- Rendimiento histórico ----
  const [range, setRange] = useState({ period: '1Y' })
  const [perf, setPerf] = useState({ status: 'idle', data: null, error: null })
  const quoteReady = detail.status === 'ready' && detail.quote?.ticker === ticker

  useEffect(() => {
    if (!quoteReady) {
      setPerf({ status: 'idle', data: null, error: null })
      return
    }
    const ctrl = new AbortController()
    setPerf(p => ({ status: 'loading', data: p.data, error: null }))
    getPerformance(ticker, range, ctrl.signal)
      .then(data => setPerf({ status: 'ready', data, error: null }))
      .catch(err => {
        if (isCancel(err)) return
        setPerf({ status: 'error', data: null, error: getErrorMessage(err) })
      })
    return () => ctrl.abort()
  }, [ticker, range, quoteReady])

  const selectAsset = (sym) => setSearchParams({ ticker: sym })
  const backToSearch = () => setSearchParams({})
  const favorites = useFavorites()

  const mascotMessage = ticker && detail.status === 'ready'
    ? 'Fíjate en la máxima caída: indica cuánto habrías tenido que aguantar en el peor momento del periodo.'
    : 'Busca una acción, un ETF, un índice o una cripto y te enseño cómo se ha comportado en el pasado. ¡Ojo! El pasado no garantiza el futuro.'

  return (
    <main className="markets">
      <PageHero
        eyebrow="Datos históricos reales"
        title="Explore Markets"
        subtitle="Consulta la evolución histórica, la rentabilidad y el riesgo de cualquier activo antes de pensar en invertir."
        aside={<Mascot pose="search" message={mascotMessage} />}
      >
        <SearchBar onSearch={handleSearch} loading={searchStatus === 'loading'} />
        <div className="markets__examples">
          <span>Prueba con</span>
          {EXAMPLES.map(sym => (
            <button key={sym} type="button" className="markets__chip" onClick={() => selectAsset(sym)}>{sym}</button>
          ))}
        </div>
      </PageHero>

      <div className="markets__body container">
        {/* ================= Búsqueda ================= */}
        {!ticker && (
          <>
            <FavoritesList items={favorites.items} onOpen={selectAsset} onRemove={favorites.remove} />

            {searchStatus === 'error' && (
              <div className="notice notice--error" role="alert">{searchError}</div>
            )}

            {searchStatus === 'done' && results.length === 0 && (
              <div className="markets__empty card" role="status">
                <p className="markets__empty-title">Sin resultados para «{query}»</p>
                <p className="markets__empty-desc">
                  Prueba con el ticker exacto (p. ej. <strong>VOO</strong>) o con el nombre de la empresa, el fondo o el índice.
                </p>
              </div>
            )}

            {searchStatus === 'loading' && (
              <div className="markets__results" aria-busy="true">
                {[0, 1, 2].map(i => <div key={i} className="skeleton markets__result-skeleton" />)}
              </div>
            )}

            {results.length > 0 && (
              <div className="markets__results">
                <div className="markets__results-header">
                  <span className="markets__results-count">{results.length} resultado{results.length !== 1 ? 's' : ''}</span>
                  <span className="markets__results-hint">Selecciona un activo para ver su análisis</span>
                </div>
                <ul className="markets__results-list">
                  {results.map(asset => (
                    <li key={asset.ticker}>
                      <button className="markets__result-item" onClick={() => selectAsset(asset.ticker)}>
                        <span className="markets__result-avatar" aria-hidden="true">{asset.ticker.replace('^', '').slice(0, 2)}</span>
                        <span className="markets__result-left">
                          <span className="markets__result-ticker">{asset.ticker}</span>
                          <span className="markets__result-name">{asset.name}</span>
                        </span>
                        <span className="markets__result-right">
                          {asset.exchange && <span className="markets__result-exchange">{asset.exchange}</span>}
                          <TypeBadge type={asset.type} size="sm" />
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {searchStatus === 'idle' && (
              <div className="markets__intro">
                {[
                  ['Rentabilidad', 'Cuánto habría ganado o perdido una inversión en el periodo, con dividendos reinvertidos.'],
                  ['Riesgo', 'Volatilidad y máxima caída: cómo de accidentado fue el camino.'],
                  ['Costes', 'El TER de fondos y ETFs, cuando la fuente lo publica.'],
                ].map(([t, d]) => (
                  <div key={t} className="markets__intro-card card">
                    <span className="markets__intro-title">{t}</span>
                    <span className="markets__intro-desc">{d}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ================= Detalle ================= */}
        {ticker && (
          <div className="markets__detail">
            <div className="markets__detail-bar">
              <button className="markets__back" onClick={backToSearch}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M13 8H3M7 4L3 8l4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {results.length > 0 ? 'Volver a resultados' : 'Volver a la búsqueda'}
              </button>
              {detail.status === 'ready' && (
                <FavoriteButton active={favorites.isFavorite(detail.quote.ticker)}
                                onToggle={() => favorites.toggle({ ticker: detail.quote.ticker, name: detail.quote.name, type: detail.quote.type })} />
              )}
            </div>

            {detail.status === 'loading' && (
              <div className="card markets__loading" role="status" aria-busy="true">
                <div className="skeleton" style={{ height: 52, width: 52, borderRadius: 16 }} />
                <div style={{ flex: 1, display: 'grid', gap: 8 }}>
                  <div className="skeleton" style={{ height: 20, width: '40%' }} />
                  <div className="skeleton" style={{ height: 14, width: '60%' }} />
                </div>
                <span className="sr-only">Cargando datos de {ticker}…</span>
              </div>
            )}

            {detail.status === 'error' && (
              <div className="notice notice--error markets__error" role="alert">
                <strong>No se puede mostrar «{ticker}»</strong>
                <span>{detail.error}</span>
                <span>Puedes buscar otro activo con el buscador de arriba.</span>
              </div>
            )}

            {detail.status === 'ready' && (
              <>
                <AssetCard quote={detail.quote} ter={detail.ter} />

                <section className="markets__perf" aria-label="Rendimiento histórico">
                  <div className="markets__perf-head">
                    <div>
                      <h2 className="markets__section-title">Rendimiento histórico</h2>
                      <p className="markets__section-sub">Simulación retrospectiva: cómo se habría comportado en el periodo elegido.</p>
                    </div>
                    <PeriodControls
                      range={range}
                      onChange={setRange}
                      minDate={perf.data?.available?.start}
                    />
                  </div>

                  <PerformanceBody perf={perf} currency={detail.quote.currency} />
                </section>

                <DataExplainer />
              </>
            )}
          </div>
        )}
      </div>
    </main>
  )
}

function PerformanceBody({ perf, currency }) {
  const loading = perf.status === 'loading' || perf.status === 'idle'

  if (perf.status === 'error') {
    return (
      <div className="notice notice--error" role="alert">
        <span>{perf.error}</span>
      </div>
    )
  }

  if (loading && !perf.data) {
    return (
      <div aria-busy="true">
        <div className="markets__metrics-skeleton">
          {[0, 1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 112, borderRadius: 18 }} />)}
        </div>
        <div className="skeleton" style={{ height: 420, borderRadius: 18, marginTop: 12 }} />
      </div>
    )
  }

  const data = perf.data
  return (
    <div className={`markets__perf-body ${loading ? 'markets__perf-body--updating' : ''}`} aria-busy={loading}>
      {data.status === 'ok' && (
        <div className="markets__range num">
          <span><b>{formatDay(data.start.date)}</b> → <b>{formatDay(data.end.date)}</b></span>
          <span className="markets__range-sep">·</span>
          <span>{data.observations.toLocaleString('es-ES')} sesiones con cotización</span>
          {data.start.close != null && data.end.close != null && (
            <>
              <span className="markets__range-sep">·</span>
              <span>Cierre cotizado: {formatPrice(data.start.close)} → {formatPrice(data.end.close)} {currency}</span>
            </>
          )}
        </div>
      )}

      {data.notices?.map(n => (
        <p key={n.code} className="notice notice--info"><span aria-hidden="true">ℹ</span><span>{n.message}</span></p>
      ))}

      {data.status === 'ok' ? (
        <>
          <MetricsPanel data={data} />
          <PerformanceChart data={data} currency={currency} />
        </>
      ) : (
        <div className="card pchart-state" role="status">
          <span className="pchart-state__title">No hay datos suficientes</span>
          <span>{data.message}</span>
          {data.available?.start && (
            <span className="text-muted">
              Histórico disponible: del {formatDay(data.available.start)} al {formatDay(data.available.end)}.
            </span>
          )}
        </div>
      )}
    </div>
  )
}

function DataExplainer() {
  return (
    <details className="explainer card">
      <summary>
        <span className="explainer__icon" aria-hidden="true">?</span>
        ¿Qué datos usamos y cómo calculamos las métricas?
      </summary>
      <div className="explainer__body">
        <p>
          <b>Valor ajustado.</b> Usamos el <i>precio de cierre ajustado</i> diario de Yahoo Finance. «Ajustado» significa que
          los precios pasados se corrigen por <b>splits</b> (cuando una acción se divide en varias) y por <b>dividendos</b>,
          como si el dinero repartido se hubiera reinvertido. Por eso la línea del gráfico puede mostrar valores pasados
          distintos de los que se veían en bolsa ese día. En el detalle del gráfico verás también el <i>cierre cotizado</i>
          (corregido solo por splits).
        </p>
        <p>
          <b>Días sin cotización.</b> Solo usamos días en los que hubo cotización: no inventamos datos para fines de semana
          ni festivos. Si eliges una fecha sin mercado, empezamos en el primer cierre disponible después de ella.
        </p>
        <p>
          <b>Cálculos.</b> Todas las métricas usan <b>todos los cierres diarios</b> del periodo; el gráfico puede dibujar menos
          puntos para ir más rápido. La rentabilidad anualizada solo aparece en periodos de al menos un año, y la volatilidad
          necesita al menos 20 variaciones diarias.
        </p>
        <p>
          <b>Divisa.</b> Los resultados están en la divisa del activo. Si inviertes en euros en un activo en dólares, el tipo
          de cambio también habría influido en tu resultado.
        </p>
        <p className="explainer__disclaimer">
          Esto es un análisis histórico con fines educativos. No es una predicción ni una recomendación de inversión.
        </p>
      </div>
    </details>
  )
}
