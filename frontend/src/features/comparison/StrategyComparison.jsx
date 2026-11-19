import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import PageHero from '../../components/PageHero'
import Mascot from '../../components/Mascot'
import InfoTip from '../../components/InfoTip'
import PeriodControls from '../../components/PeriodControls'
import { useStrategies } from '../strategies/StrategiesContext'
import { strategyStatus } from '../strategies/model'
import { getBenchmarks, runBacktest, toApiStrategy } from '../../api/comparisonApi'
import { getErrorMessage, isCancel } from '../../api/marketApi'
import { formatDay } from '../../utils/format'
import ComparisonPicker from './ComparisonPicker'
import ComparisonChart from './ComparisonChart'
import ComparisonTable, { BenchmarkSection, ContributionsTable } from './ComparisonTable'
import CompositionCompare from './CompositionCompare'
import { COMPARISON_PRESETS, loadSelection, MAX_SELECTED, saveSelection, STRATEGY_COLORS } from './selection'
import './StrategyComparison.css'

export default function StrategyComparison() {
  const store = useStrategies()
  const { strategies } = store
  const navigate = useNavigate()

  const validIds = useMemo(() => strategies.filter(s => strategyStatus(s).valid).map(s => s.id), [strategies])
  const [saved] = useState(loadSelection)
  const [selected, setSelected] = useState(() => saved?.selected ?? validIds.slice(0, MAX_SELECTED))
  const [range, setRange] = useState(() => saved?.range ?? { period: '5Y' })
  const [benchmark, setBenchmark] = useState(() => saved?.benchmark ?? '')
  const [benchmarks, setBenchmarks] = useState([])
  const [result, setResult] = useState({ status: 'idle', data: null, error: null })

  useEffect(() => { saveSelection(selected, range, benchmark) }, [selected, range, benchmark])
  useEffect(() => {
    const ctrl = new AbortController()
    getBenchmarks(ctrl.signal).then(setBenchmarks).catch(() => {})
    return () => ctrl.abort()
  }, [])

  // Estrategias que realmente se comparan: seleccionadas, existentes y válidas (orden del Strategy Builder).
  const compared = useMemo(
    () => strategies.filter(s => selected.includes(s.id) && validIds.includes(s.id)).slice(0, MAX_SELECTED),
    [strategies, selected, validIds],
  )
  const colors = useMemo(() => {
    const map = {}
    compared.forEach((s, i) => { map[s.id] = STRATEGY_COLORS[i % STRATEGY_COLORS.length] })
    return map
  }, [compared])

  const requestKey = JSON.stringify({ s: compared.map(toApiStrategy), range, benchmark })

  useEffect(() => {
    if (compared.length < 2) {
      setResult({ status: 'idle', data: null, error: null })
      return
    }
    const ctrl = new AbortController()
    setResult(r => ({ status: 'loading', data: r.data, error: null }))
    const timer = setTimeout(() => {
      runBacktest(compared, range, ctrl.signal, benchmark)
        .then(data => setResult({ status: 'ready', data, error: null }))
        .catch(err => {
          if (isCancel(err)) return
          setResult({ status: 'error', data: null, error: getErrorMessage(err) })
        })
    }, 300)
    return () => { clearTimeout(timer); ctrl.abort() }
    // requestKey resume compared + range
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey])

  const toggle = id => setSelected(sel => (sel.includes(id) ? sel.filter(x => x !== id) : [...sel, id]))
  const editInBuilder = id => { store.select(id); navigate('/strategy-builder') }

  const hero = (
    <PageHero
      eyebrow="Simulación histórica"
      title="Strategy Comparison"
      subtitle="Cómo se habrían comportado tus estrategias si las hubieras puesto en marcha en un mismo periodo del pasado."
      compact
      aside={<Mascot pose="search" message="Compara tus estrategias en el mismo periodo. Recuerda: es historia, no una predicción." />}
    />
  )

  // ---- Estados vacíos ----
  if (strategies.length < 2 || validIds.length < 2) {
    const invalid = strategies.filter(s => !validIds.includes(s.id))
    return (
      <main className="cmp">
        {hero}
        <div className="cmp__body container">
          <section className="cmp-empty card" data-testid="cmp-empty">
            <h2 className="cmp-empty__title">
              {strategies.length < 2 ? 'Necesitas al menos dos estrategias para compararlas' : 'Necesitas al menos dos estrategias completas'}
            </h2>
            <p className="cmp-muted">
              {strategies.length === 0 && 'Todavía no has creado ninguna estrategia.'}
              {strategies.length === 1 && 'Tienes una estrategia. Crea otra (o duplica la que tienes y cámbiala) para poder compararlas.'}
              {strategies.length >= 2 && `Tienes ${strategies.length} estrategias, pero solo ${validIds.length} ${validIds.length === 1 ? 'está lista' : 'están listas'}. Una estrategia está lista cuando tiene activos, sus pesos suman 100 % y el capital es válido.`}
            </p>
            {invalid.length > 0 && strategies.length >= 2 && (
              <ul className="cmp-empty__list">
                {invalid.map(s => (
                  <li key={s.id}>
                    <b>{s.name}</b>: {strategyStatus(s).issues.join(' ')}{' '}
                    <button type="button" className="cmp-link" onClick={() => editInBuilder(s.id)}>Editar</button>
                  </li>
                ))}
              </ul>
            )}
            <Link to="/strategy-builder" className="btn-primary" data-testid="cmp-go-builder">Ir a Strategy Builder</Link>
          </section>
        </div>
      </main>
    )
  }

  const data = result.data
  const ok = data?.status === 'ok'

  return (
    <main className="cmp">
      {hero}
      <div className="cmp__body container">
        <section className="cmp-setup card">
          <div className="cmp-setup__block">
            <div className="cmp-setup__head">
              <h2 className="cmp-step"><span>1</span> Elige las estrategias</h2>
              <span className="cmp-muted num">{compared.length} de {MAX_SELECTED} como máximo</span>
            </div>
            <ComparisonPicker strategies={strategies} selected={selected} colors={colors} onToggle={toggle} onEdit={editInBuilder} />
          </div>
          <div className="cmp-setup__block">
            <div className="cmp-setup__head">
              <h2 className="cmp-step"><span>2</span> Elige el periodo</h2>
            </div>
            <PeriodControls range={range} onChange={setRange} presets={COMPARISON_PRESETS}
                            minDate={data?.common?.start} minDateLabel="Periodo común disponible desde el" />
            <label className="cmp-bench-pick">
              <span className="cmp-label">Referencia de mercado (opcional)</span>
              <select value={benchmark} onChange={e => setBenchmark(e.target.value)} data-testid="cmp-benchmark-select">
                <option value="">Sin referencia</option>
                {benchmarks.map(b => <option key={b.id} value={b.id}>{b.name} · {b.kind_label}</option>)}
              </select>
            </label>
          </div>
        </section>

        {compared.length < 2 && (
          <p className="notice notice--info" role="status">Selecciona al menos dos estrategias para ver la comparación.</p>
        )}

        {result.status === 'error' && (
          <div className="notice notice--error" role="alert" data-testid="cmp-error">{result.error}</div>
        )}

        {result.status === 'loading' && !data && (
          <div aria-busy="true" className="cmp-loading">
            <div className="skeleton" style={{ height: 64, borderRadius: 14 }} />
            <div className="skeleton" style={{ height: 420, borderRadius: 18 }} />
            <span className="cmp-muted">Descargando precios y calculando… la primera vez puede tardar unos segundos.</span>
          </div>
        )}

        {data && compared.length >= 2 && result.status !== 'error' && (
          <div className={`cmp-results ${result.status === 'loading' ? 'is-updating' : ''}`} aria-busy={result.status === 'loading'}>
            {data.notices?.map(n => (
              <p key={n.code} className="notice notice--info" data-testid="cmp-notice"><span aria-hidden="true">ℹ</span><span>{n.message}</span></p>
            ))}

            {!ok ? (
              <div className="card cmp-nodata" role="status" data-testid="cmp-nodata">
                <b>No hay datos suficientes para comparar</b>
                <span>{data.message}</span>
              </div>
            ) : (
              <>
                <MethodStrip data={data} />
                <ComparisonChart data={data} colors={colors} />
                <ComparisonTable data={data} colors={colors} />
                <BenchmarkSection data={data} colors={colors} />
                <ContributionsTable data={data} colors={colors} />
                <CompositionCompare data={data} colors={colors} />
              </>
            )}
            <Methodology />
          </div>
        )}
      </div>
    </main>
  )
}

function MethodStrip({ data }) {
  const fx = data.fx.map(f => f.currency).join(', ')
  return (
    <div className="cmp-strip card" data-testid="cmp-strip">
      <div className="cmp-strip__item">
        <span className="cmp-label">
          Periodo común efectivo
          <InfoTip title="Periodo común">
            Todas las estrategias se comparan en las mismas fechas: solo los días en los que todos sus activos
            tenían cotización. Si un activo empezó a cotizar más tarde, el periodo empieza cuando él empieza.
          </InfoTip>
        </span>
        <b className="num" data-testid="cmp-effective">{formatDay(data.effective.start)} → {formatDay(data.effective.end)}</b>
        <span className="cmp-muted num">{data.effective.observations.toLocaleString('es-ES')} días con cotización común</span>
      </div>
      <div className="cmp-strip__item">
        <span className="cmp-label">
          Método
          <InfoTip title="Buy & hold">
            Se reparte el capital según los pesos al inicio y no se vuelve a tocar (sin rebalanceo). Los pesos
            cambian con el mercado.
          </InfoTip>
        </span>
        <b>{data.method.contributions ? 'Comprar y mantener + aportaciones' : 'Comprar y mantener'}</b>
        <span className="cmp-muted">
          Precios ajustados · sin comisiones{data.method.contributions ? ' · rentabilidad TWR' : ''}
        </span>
      </div>
      <div className="cmp-strip__item">
        <span className="cmp-label">
          Divisa
          <InfoTip title="Todo en euros" align="right">
            Los activos que cotizan en otra moneda se convierten a euros con el tipo de cambio diario de Yahoo
            Finance. Así el resultado incluye el efecto divisa que vive un inversor en euros, y por eso puede
            diferir de la rentabilidad en dólares que ves en Explore Markets.
          </InfoTip>
        </span>
        <b>EUR</b>
        <span className="cmp-muted">{fx ? `Convertidos desde ${fx}` : 'Todos los activos cotizan en euros'}</span>
      </div>
    </div>
  )
}

function Methodology() {
  return (
    <details className="explainer card">
      <summary>
        <span className="explainer__icon" aria-hidden="true">?</span>
        ¿Cómo se calcula esta comparación?
      </summary>
      <div className="explainer__body">
        <p><b>1. Precios.</b> Cierre diario ajustado de Yahoo Finance: incluye splits y dividendos reinvertidos. No se suman dividendos aparte.</p>
        <p><b>2. Euros.</b> Cada activo en otra divisa se pasa a euros con el tipo de cambio de ese mismo día (p. ej. precio en USD ÷ EUR/USD).</p>
        <p><b>3. Mismas fechas para todas.</b> Solo se usan los días en los que todos los activos de las estrategias seleccionadas (y sus tipos de cambio) tienen cierre. No se inventa ni se rellena ningún precio.</p>
        <p><b>4. Compra y mantenimiento.</b> El primer día se reparte el capital según los pesos; después cada posición evoluciona con su activo. No hay rebalanceo.</p>
        <p><b>5. Aportaciones periódicas.</b> Si la estrategia las tiene, cada una compra solo su activo el mismo día de cada mes, trimestre o año (o el siguiente día con cotización común). Son dinero nuevo, no rentabilidad: se muestran aparte (total aportado, valor final y ganancia en euros).</p>
        <p><b>6. Métricas.</b> Las mismas fórmulas que en Explore Markets. Con aportaciones se aplican a la rentabilidad ponderada por el tiempo (TWR), que descuenta cada aportación del día en que entra.</p>
        <p><b>Costes.</b> No se restan comisiones del broker (se verán en Cost Analysis). El TER de los ETF y fondos ya está descontado en su precio, así que no se resta otra vez.</p>
        <p className="explainer__disclaimer">
          Simulación histórica con fines educativos: los resultados dependen del periodo elegido y no predicen
          rentabilidades futuras. No es una recomendación de inversión.
        </p>
      </div>
    </details>
  )
}
