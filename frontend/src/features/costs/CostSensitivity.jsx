import { useEffect, useMemo, useState } from 'react'
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import InfoTip from '../../components/InfoTip'
import { getSensitivity } from '../../api/costsApi'
import { getErrorMessage, isCancel } from '../../api/marketApi'
import { formatPrice } from '../../utils/format'

const PROFILE_COLORS = { buy_hold: '#0E9F6E', low: '#4B5BF6', medium: '#F59E0B', high: '#E5484D' }
const AXIS = { fontSize: 11, fill: '#8890AA', fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 500 }
const MARKETS = [
  { value: 'EUROZONE', label: 'Zona euro (EUR)' },
  { value: 'ES', label: 'Bolsa española (EUR)' },
  { value: 'US', label: 'EE. UU. (USD)' },
]
const eur = v => `${formatPrice(v, 0)} €`
const num = (raw, fallback) => {
  const n = Number(String(raw).replace(',', '.'))
  return Number.isFinite(n) ? n : fallback
}

/**
 * Sensibilidad a costes: ejercicio HIPOTÉTICO que muestra cómo pequeños costes
 * repetidos erosionan el interés compuesto según el perfil de rotación. Está
 * separado del resultado histórico real y lo dice en la propia sección.
 */
export default function CostSensitivity({ brokers }) {
  const [form, setForm] = useState({ capital: '10000', years: '20', annual_return_pct: '5', recurring_pct: '0', broker: 'myinvestor', market: 'EUROZONE' })
  const [res, setRes] = useState({ status: 'loading', data: null, error: null })

  const params = useMemo(() => ({
    capital: num(form.capital, 10000), years: Math.round(num(form.years, 20)),
    annual_return_pct: num(form.annual_return_pct, 5), recurring_pct: num(form.recurring_pct, 0),
    broker: form.broker, market: form.market,
  }), [form])
  const key = JSON.stringify(params)

  useEffect(() => {
    const ctrl = new AbortController()
    setRes(r => ({ ...r, status: 'loading' }))
    const t = setTimeout(() => {
      getSensitivity(params, ctrl.signal)
        .then(data => setRes({ status: 'ready', data, error: null }))
        .catch(err => { if (!isCancel(err)) setRes({ status: 'error', data: null, error: getErrorMessage(err) }) })
    }, 300)
    return () => { clearTimeout(t); ctrl.abort() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  const chart = useMemo(() => {
    if (!res.data) return []
    const ps = res.data.profiles
    // Diferencia acumulada frente al escenario sin costes (lo que se deja de tener), año a año.
    return ps[0].series.map((row, i) => ({
      year: row.year,
      ...Object.fromEntries(ps.map(p => [p.id, Math.max(0, p.series[i].no_cost - p.series[i].value)])),
    }))
  }, [res.data])

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))
  const field = (k, label, unit, props = {}) => (
    <label className="cost-field">
      <span className="cost-field__label">{label}</span>
      <span className="cost-field__input">
        <input inputMode="decimal" value={form[k]} onChange={set(k)} data-testid={`sens-${k}`} {...props} />
        <span className="cost-field__unit">{unit}</span>
      </span>
    </label>
  )

  return (
    <section className="card cost-sens" aria-label="Sensibilidad a costes de operativa y rotación" data-testid="cost-sensitivity">
      <div className="cmp-chart__head">
        <h3 className="cmp-section-title">
          Sensibilidad a costes de operativa (rotación)
          <InfoTip title="¿Qué muestra?">
            Cómo las comisiones de compraventa, repetidas año tras año según cuánto rotas la cartera, se acumulan por el
            interés compuesto: lo que pagas en costes deja de crecer. Del intermediario solo usa las comisiones de
            compraventa y de cambio de divisa; su custodia no se incluye. Puedes añadir un coste recurrente propio
            (un % anual sobre el valor).
          </InfoTip>
        </h3>
        <span className="cost-badge cost-sens__badge" data-testid="sens-badge">Escenario de sensibilidad · simulación educativa</span>
      </div>
      <p className="notice notice--info cost-sens__note">
        <span aria-hidden="true">ℹ</span>
        <span>
          Este ejercicio es <b>hipotético</b> y está separado del resultado histórico de arriba: usa una rentabilidad anual
          <b> supuesta</b> (no es una previsión) y un único ETF genérico. Del intermediario solo aplica las
          <b> comisiones de compraventa y de divisa</b>: <b>la custodia de su tarifa no se incluye</b> (el análisis
          histórico de arriba sí la tiene en cuenta). El coste recurrente es opcional, lo introduces tú, y nunca se resta
          del backtest real (el TER ya está en el precio histórico).
        </span>
      </p>

      <div className="cost-sens__controls">
        {field('capital', 'Capital inicial', '€')}
        {field('years', 'Horizonte', 'años')}
        {field('annual_return_pct', 'Rentabilidad anual supuesta', '%')}
        {field('recurring_pct', 'Coste recurrente anual', '% / año')}
        <label className="cost-field">
          <span className="cost-field__label">Intermediario (costes de operativa)</span>
          <select className="cost-sens__select" value={form.broker} onChange={set('broker')} data-testid="sens-broker">
            <option value="none">Sin comisiones</option>
            {brokers.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </label>
        <label className="cost-field">
          <span className="cost-field__label">Mercado del ETF</span>
          <select className="cost-sens__select" value={form.market} onChange={set('market')} data-testid="sens-market">
            {MARKETS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </label>
      </div>

      {res.status === 'error' && <p className="notice notice--warn" role="alert" data-testid="sens-error">{res.error}</p>}

      {res.data && (
        <div className={res.status === 'loading' ? 'is-updating' : ''}>
          <div className="cmp-table-scroll">
            <table className="cmp-table cost-table" data-testid="sens-table">
              <thead>
                <tr>
                  <th scope="col">Perfil de operativa</th>
                  <th scope="col">Hipótesis</th>
                  <th scope="col" className="num">Costes de operativa pagados</th>
                  <th scope="col" className="num">Costes recurrentes pagados</th>
                  <th scope="col" className="num">Valor final</th>
                  <th scope="col" className="num">Diferencia frente a sin costes</th>
                </tr>
              </thead>
              <tbody>
                {res.data.profiles.map(p => (
                  <tr key={p.id} data-testid="sens-row">
                    <th scope="row"><span className="cmp-table__name"><span className="cmp-table__dot" style={{ background: PROFILE_COLORS[p.id] }} />{p.name}</span></th>
                    <td className="cost-sens__hyp">{p.description}</td>
                    <td className="num">{eur(p.paid_trading)}</td>
                    <td className="num">{eur(p.paid_recurring)}</td>
                    <td className="num"><b>{eur(p.final_value)}</b></td>
                    <td className="num is-down" data-testid="sens-diff">−{eur(p.difference)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="cmp-muted">
            Sin costes, el capital llegaría a <b>{eur(res.data.profiles[0].no_cost_final)}</b> en {params.years} años con la
            rentabilidad supuesta. La diferencia frente a ese escenario es mayor que lo pagado, porque cada euro de coste
            deja de capitalizarse.
          </p>

          <div className="cost-sens__chart" data-testid="sens-chart">
            <h4 className="cost-sens__chart-title">Diferencia acumulada frente al escenario sin costes</h4>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chart} margin={{ top: 10, right: 8, left: 8, bottom: 0 }}>
                <CartesianGrid stroke="#EDF0F7" vertical={false} />
                <XAxis dataKey="year" tick={AXIS} axisLine={false} tickLine={false} tickFormatter={y => `Año ${y}`} minTickGap={24} />
                <YAxis domain={[0, 'auto']} tick={AXIS} axisLine={false} tickLine={false} width={64}
                       tickFormatter={v => eur(v)} />
                <Tooltip formatter={(v, name) => [eur(v), name]} labelFormatter={y => `Año ${y}`} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {res.data.profiles.map(p => (
                  <Line key={p.id} dataKey={p.id} name={p.name} stroke={PROFILE_COLORS[p.id]} strokeWidth={2}
                        dot={false} isAnimationActive={false} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="cmp-muted">
            Cada línea es lo que se deja de tener respecto a no pagar costes: comisiones y costes recurrentes más lo que
            ese dinero habría rendido. Eje vertical desde 0 €. Supuestos: una compra inicial; cada perfil vende y
            recompra la parte indicada de la cartera repartida en sus órdenes anuales; comisiones de la tarifa oficial
            del intermediario elegido{res.data.assumptions.fx_rates?.USD ? ` (comisiones fijas en dólares al tipo EUR/USD ${formatPrice(res.data.assumptions.fx_rates.USD, 4)})` : ''}.
          </p>
        </div>
      )}
    </section>
  )
}
