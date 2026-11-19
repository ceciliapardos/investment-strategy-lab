import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import PageHero from '../../components/PageHero'
import Mascot from '../../components/Mascot'
import InfoTip from '../../components/InfoTip'
import PeriodControls from '../../components/PeriodControls'
import { useStrategies } from '../strategies/StrategiesContext'
import { strategyStatus } from '../strategies/model'
import { toApiStrategy } from '../../api/comparisonApi'
import { analyzeCosts, getBrokers } from '../../api/costsApi'
import { getErrorMessage, isCancel } from '../../api/marketApi'
import { formatDay } from '../../utils/format'
import ComparisonPicker from '../comparison/ComparisonPicker'
import { COMPARISON_PRESETS, MAX_SELECTED, STRATEGY_COLORS } from '../comparison/selection'
import ScenarioPicker, { CustomCostsForm } from './ScenarioPicker'
import CostSensitivity from './CostSensitivity'
import { BrokerCompare, CostBreakdown, CostSummaryTable, ImpactBars, ProductCosts, ScenarioInfo } from './CostResults'
import { CUSTOM_ID, EMPTY_CUSTOM, formatSourceDate, loadCostState, parseCustom, saveCostState } from './model'
import '../comparison/StrategyComparison.css'
import './CostAnalysis.css'

export default function CostAnalysis() {
  const store = useStrategies()
  const { strategies } = store
  const navigate = useNavigate()

  const validIds = useMemo(() => strategies.filter(s => strategyStatus(s).valid).map(s => s.id), [strategies])
  const [saved] = useState(loadCostState)
  const [selected, setSelected] = useState(() => saved?.selected ?? validIds.slice(0, MAX_SELECTED))
  const [range, setRange] = useState(() => saved?.range ?? { period: '5Y' })
  const [scenario, setScenario] = useState(() => saved?.scenario ?? null)
  const [customForm, setCustomForm] = useState(() => saved?.custom ?? EMPTY_CUSTOM)
  const [focus, setFocus] = useState(() => saved?.focus ?? null)
  const [brokers, setBrokers] = useState({ status: 'loading', list: [], error: null })
  const [result, setResult] = useState({ status: 'idle', data: null, error: null })

  // Intermediarios del dataset (las tarifas nunca viven en React).
  useEffect(() => {
    const ctrl = new AbortController()
    getBrokers(ctrl.signal)
      .then(d => setBrokers({ status: 'ready', list: d.brokers, version: d.dataset_version, error: null }))
      .catch(err => { if (!isCancel(err)) setBrokers({ status: 'error', list: [], error: getErrorMessage(err) }) })
    return () => ctrl.abort()
  }, [])

  // Sin escenario por defecto: hasta que el usuario elige, no se calculan costes de ningún intermediario.
  const knownIds = ['none', CUSTOM_ID, ...brokers.list.map(b => b.id)]
  const scenarioId = scenario && (brokers.status !== 'ready' || knownIds.includes(scenario)) ? scenario : null

  useEffect(() => { saveCostState({ selected, range, scenario, custom: customForm, focus }) },
    [selected, range, scenario, customForm, focus])

  const custom = useMemo(() => parseCustom(customForm), [customForm])
  const [appliedCustom, setAppliedCustom] = useState(() => (custom.valid ? custom.values : {}))
  useEffect(() => { if (custom.valid) setAppliedCustom(custom.values) }, [custom])

  const analyzed = useMemo(
    () => strategies.filter(s => selected.includes(s.id) && validIds.includes(s.id)).slice(0, MAX_SELECTED),
    [strategies, selected, validIds],
  )
  const colors = useMemo(() => {
    const map = {}
    analyzed.forEach((s, i) => { map[s.id] = STRATEGY_COLORS[i % STRATEGY_COLORS.length] })
    return map
  }, [analyzed])

  const requestKey = JSON.stringify({ s: analyzed.map(toApiStrategy), range, c: appliedCustom, on: Boolean(scenarioId) })

  useEffect(() => {
    if (analyzed.length < 1 || !scenarioId) {
      setResult({ status: 'idle', data: null, error: null })
      return
    }
    const ctrl = new AbortController()
    setResult(r => ({ status: 'loading', data: r.data, error: null }))
    const timer = setTimeout(() => {
      analyzeCosts(analyzed, range, appliedCustom, ctrl.signal)
        .then(data => setResult({ status: 'ready', data, error: null }))
        .catch(err => {
          if (isCancel(err)) return
          setResult({ status: 'error', data: null, error: getErrorMessage(err) })
        })
    }, 400)
    return () => { clearTimeout(timer); ctrl.abort() }
    // requestKey resume estrategias + periodo + costes personalizados
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey])

  const toggle = id => setSelected(sel => (sel.includes(id) ? sel.filter(x => x !== id) : [...sel, id]))
  const editInBuilder = id => { store.select(id); navigate('/strategy-builder') }

  const hero = (
    <PageHero
      eyebrow="Simulación histórica"
      title="Cost Analysis"
      subtitle="Cuánto habría costado poner en marcha tus estrategias con distintos intermediarios y cómo cambia el resultado."
      compact
      aside={<Mascot pose="search" message="Las comisiones también cuentan. Mira cuánto restan, sin buscar «el mejor»." />}
    />
  )

  if (validIds.length < 1) {
    return (
      <main className="cmp cost">
        {hero}
        <div className="cmp__body container">
          <section className="cmp-empty card" data-testid="cost-empty">
            <h2 className="cmp-empty__title">Necesitas al menos una estrategia completa</h2>
            <p className="cmp-muted">
              {strategies.length === 0
                ? 'Todavía no has creado ninguna estrategia.'
                : 'Ninguna de tus estrategias está lista: necesita activos, pesos que sumen 100 % y un capital válido.'}
            </p>
            <Link to="/strategy-builder" className="btn-primary">Ir a Strategy Builder</Link>
          </section>
        </div>
      </main>
    )
  }

  const data = result.data
  const ok = data?.status === 'ok'
  const showScenario = ok && data.strategies[0]?.costs?.[scenarioId] ? scenarioId : 'none'
  const scenarioMeta = data?.scenarios?.find(s => s.id === showScenario)

  return (
    <main className="cmp cost">
      {hero}
      <div className="cmp__body container">
        <section className="cmp-setup card cost-setup">
          <div className="cmp-setup__block">
            <div className="cmp-setup__head">
              <h2 className="cmp-step"><span>1</span> Elige las estrategias</h2>
              <span className="cmp-muted num">{analyzed.length} de {MAX_SELECTED} como máximo</span>
            </div>
            <ComparisonPicker strategies={strategies} selected={selected} colors={colors} onToggle={toggle} onEdit={editInBuilder} />
          </div>
          <div className="cmp-setup__block">
            <div className="cmp-setup__head">
              <h2 className="cmp-step"><span>2</span> Elige el periodo</h2>
            </div>
            <PeriodControls range={range} onChange={setRange} presets={COMPARISON_PRESETS}
                            minDate={data?.common?.start} minDateLabel="Periodo común disponible desde el" />
          </div>
          <div className="cmp-setup__block cost-setup__full">
            <div className="cmp-setup__head">
              <h2 className="cmp-step"><span>3</span> ¿A través de qué intermediario?</h2>
              <BrokerCostsTip />
            </div>
            {brokers.status === 'error' && <p className="notice notice--error" role="alert">{brokers.error}</p>}
            <ScenarioPicker brokers={brokers.list} scenario={scenarioId} onChange={setScenario} />
            {scenarioId === CUSTOM_ID && (
              <CustomCostsForm form={customForm} errors={custom.errors} onChange={setCustomForm} />
            )}
          </div>
        </section>

        {analyzed.length < 1 && (
          <p className="notice notice--info" role="status">Selecciona al menos una estrategia para ver sus costes.</p>
        )}

        {analyzed.length >= 1 && !scenarioId && (
          <div className="card cost-pick-prompt" role="status" data-testid="cost-pick-prompt">
            <b>Selecciona intermediario</b>
            <span>Elige un banco, un broker, «Costes personalizados» o «Sin costes de intermediación» para calcular los costes.</span>
          </div>
        )}

        {result.status === 'error' && (
          <div className="notice notice--error" role="alert" data-testid="cost-error">{result.error}</div>
        )}

        {result.status === 'loading' && !data && (
          <div aria-busy="true" className="cmp-loading">
            <div className="skeleton" style={{ height: 64, borderRadius: 14 }} />
            <div className="skeleton" style={{ height: 320, borderRadius: 18 }} />
            <span className="cmp-muted">Descargando precios y calculando costes…</span>
          </div>
        )}

        {data && scenarioId && analyzed.length >= 1 && result.status !== 'error' && (
          <div className={`cmp-results ${result.status === 'loading' ? 'is-updating' : ''}`} aria-busy={result.status === 'loading'}>
            {data.notices?.map(n => (
              <p key={n.code} className="notice notice--info"><span aria-hidden="true">ℹ</span><span>{n.message}</span></p>
            ))}
            {!ok ? (
              <div className="card cmp-nodata" role="status" data-testid="cost-nodata">
                <b>No hay datos suficientes para este periodo</b>
                <span>{data.message}</span>
              </div>
            ) : (
              <>
                <CostStrip data={data} scenario={scenarioMeta} />
                <CostSummaryTable data={data} scenario={showScenario} colors={colors} />
                <ImpactBars data={data} scenario={showScenario} colors={colors} />
                <CostBreakdown data={data} scenario={showScenario} colors={colors} />
                <BrokerCompare data={data} focus={focus} onFocus={setFocus} />
                <ProductCosts data={data} />
                <ScenarioInfo scenario={scenarioMeta} />
              </>
            )}
            <CostMethodology />
          </div>
        )}

        {brokers.status === 'ready' && <CostSensitivity brokers={brokers.list} />}
      </div>
    </main>
  )
}

function BrokerCostsTip() {
  return (
    <InfoTip title="Costes de intermediación" align="right">
      Comisiones cobradas por el banco o broker por operar o mantener la inversión.
    </InfoTip>
  )
}

function CostStrip({ data, scenario }) {
  const consulted = scenario?.source?.consulted
  return (
    <div className="cmp-strip card" data-testid="cost-strip">
      <div className="cmp-strip__item">
        <span className="cmp-label">Periodo común efectivo</span>
        <b className="num">{formatDay(data.effective.start)} → {formatDay(data.effective.end)}</b>
        <span className="cmp-muted">El mismo que en Strategy Comparison</span>
      </div>
      <div className="cmp-strip__item">
        <span className="cmp-label">Intermediario</span>
        <b data-testid="cost-strip-scenario">{scenario?.name}</b>
        <span className="cmp-muted">
          {consulted ? `Tarifas consultadas a ${formatSourceDate(consulted)}`
            : scenario?.kind === 'custom' ? 'Datos introducidos por ti' : 'Referencia sin comisiones'}
        </span>
      </div>
      <div className="cmp-strip__item">
        <span className="cmp-label">Método</span>
        <b>{data.method?.contributions ? 'Comprar y mantener + aportaciones' : 'Comprar y mantener'} · EUR</b>
        <span className="cmp-muted">
          {data.method?.contributions
            ? 'Una compra inicial por activo y una más por cada aportación'
            : 'Una compra por activo al inicio · sin rebalanceo'}
        </span>
      </div>
    </div>
  )
}

function CostMethodology() {
  return (
    <details className="explainer card">
      <summary>
        <span className="explainer__icon" aria-hidden="true">?</span>
        ¿Cómo se calculan los costes?
      </summary>
      <div className="explainer__body">
        <p><b>1. Mismo backtest.</b> Se parte del resultado histórico de Strategy Comparison (mismas fechas, precios ajustados, todo en euros).</p>
        <p><b>2. Compras.</b> Cada activo se compra una vez el primer día y, si hay aportaciones periódicas, otra vez en cada aportación. Cada compra paga su comisión y, si el activo no cotiza en euros y el intermediario la cobra, el cambio de divisa: se invierte un poco menos.</p>
        <p><b>3. Reglas de cada tarifa.</b> Tramos por importe, mínimos, máximos, órdenes gratuitas al mes y planes de inversión sin comisión cuando la tarifa oficial los publica.</p>
        <p><b>4. Custodia y mantenimiento.</b> Con la periodicidad de cada tarifa (trimestral, semestral o anual; por clase de valor o sobre el valor de la cartera), prorrateados por días y calculados sobre el patrimonio de cada momento, que crece con las aportaciones.</p>
        <p><b>5. Salida, aparte.</b> La comisión de venta (y la divisa de vuelta) se muestra como «coste estimado de salida»: no se suma a los costes ya incurridos.</p>
        <p><b>6. TER.</b> No se resta: ya está dentro del precio histórico de cada ETF o fondo.</p>
        <p><b>No incluye:</b> impuestos, cánones de bolsa, diferencial de compraventa (spread) ni otros costes no publicados en la tarifa.</p>
        <p className="explainer__disclaimer">
          Las tarifas pueden cambiar y algunas dependen del tipo de cuenta o del plan. Esto es una simulación
          histórica con fines educativos: consulta siempre la tarifa oficial vigente antes de invertir. No es una
          recomendación de ningún intermediario.
        </p>
      </div>
    </details>
  )
}
