import { useMemo, useState } from 'react'
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import InfoTip from '../../components/InfoTip'
import { formatDay, formatFraction, formatPrice, parseDay } from '../../utils/format'

const AXIS = { fontSize: 11, fill: '#8890AA', fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 500 }

function tickFormatter(spanDays) {
  if (spanDays <= 100) return d => formatDay(d, { day: 'numeric', month: 'short' })
  if (spanDays <= 800) return d => formatDay(d, { month: 'short', year: '2-digit' })
  return d => formatDay(d, { year: 'numeric' })
}

function ValueTooltip({ active, payload, label, meta }) {
  if (!active || !payload?.length) return null
  return (
    <div className="cmp-tip">
      <div className="cmp-tip__date">{formatDay(label, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</div>
      {meta.map(m => {
        const p = payload.find(x => x.dataKey === m.id)
        if (!p || p.value == null) return null
        const eur = p.payload?.__eur?.[m.id]
        return (
          <div key={m.id} className="cmp-tip__row">
            <span className="cmp-tip__dot" style={{ background: m.color }} />
            <span className="cmp-tip__name">{m.name}</span>
            <b className="num">{formatPrice(p.value)}</b>
            <span className="cmp-tip__eur num">{eur != null ? `${formatPrice(eur, 0)} €` : ''}</span>
          </div>
        )
      })}
      {(() => {
        const b = payload.find(x => x.dataKey === '__bench')
        return b && b.value != null ? (
          <div className="cmp-tip__row">
            <span className="cmp-tip__dot" style={{ background: BENCH_COLOR }} />
            <span className="cmp-tip__name">Referencia: {b.name}</span>
            <b className="num">{formatPrice(b.value)}</b>
            <span />
          </div>
        ) : null
      })()}
    </div>
  )
}

const BENCH_COLOR = '#475569'

function DdTooltip({ active, payload, label, meta }) {
  if (!active || !payload?.length) return null
  return (
    <div className="cmp-tip">
      <div className="cmp-tip__date">{formatDay(label)}</div>
      {meta.map(m => {
        const p = payload.find(x => x.dataKey === m.id)
        return p ? (
          <div key={m.id} className="cmp-tip__row">
            <span className="cmp-tip__dot" style={{ background: m.color }} />
            <span className="cmp-tip__name">{m.name}</span>
            <b className="num">{formatFraction(p.value, { decimals: 1 })}</b>
          </div>
        ) : null
      })}
    </div>
  )
}

/** Evolución de 100 € invertidos (base 100) y caída desde máximos de cada estrategia. */
export default function ComparisonChart({ data, colors }) {
  const [hidden, setHidden] = useState(() => new Set())
  const meta = data.strategies.map(s => ({ id: s.id, name: s.name, color: colors[s.id], capital: s.initial_capital }))

  const { values, dds, spanDays, ddFloor } = useMemo(() => {
    const values = data.series.map(p => ({ date: p.date, ...p.values, __eur: p.eur, __bench: p.benchmark ?? null }))
    const dds = data.series.map(p => ({ date: p.date, ...p.dd }))
    const first = parseDay(data.series[0].date)
    const last = parseDay(data.series[data.series.length - 1].date)
    const minDd = Math.min(-0.01, ...data.series.flatMap(p => Object.values(p.dd).filter(v => v != null)))
    const step = minDd < -0.4 ? 0.2 : minDd < -0.2 ? 0.1 : 0.05
    return { values, dds, spanDays: (last - first) / 86400000, ddFloor: Math.floor(minDd / step) * step }
  }, [data])

  const fmt = tickFormatter(spanDays)
  const benchOk = data.benchmark?.status === 'ok'
  const visible = meta.filter(m => !hidden.has(m.id))
  const toggle = id => setHidden(h => {
    const next = new Set(h)
    if (next.has(id)) next.delete(id)
    else if (meta.length - next.size > 1) next.add(id) // siempre queda al menos una visible
    return next
  })

  return (
    <section className="cmp-chart card" aria-label="Evolución comparada">
      <header className="cmp-chart__head">
        <div>
          <h3 className="cmp-section-title">
            Evolución de cada 100 € invertidos
            <InfoTip title="Base 100">
              Todas las estrategias empiezan en 100 para poder compararlas aunque tengan capitales distintos.
              Si una línea llega a 130, cada 100 € se habrían convertido en 130 € (en euros, con dividendos
              reinvertidos y sin costes de intermediación). Con aportaciones periódicas la línea mide solo la
              rentabilidad (ponderada por el tiempo): el dinero aportado no la hace subir.
            </InfoTip>
          </h3>
          <p className="cmp-muted">
            {data.method?.contributions
              ? 'Rentabilidad sin contar las aportaciones · el tooltip muestra el valor real en euros, que sí las incluye'
              : 'Valor en euros · pasa el ratón para ver el valor real de cada estrategia'}
          </p>
        </div>
        <div className="cmp-legend" role="group" aria-label="Mostrar u ocultar estrategias">
          {meta.map(m => (
            <button key={m.id} type="button" className={`cmp-legend__item ${hidden.has(m.id) ? 'is-off' : ''}`}
                    onClick={() => toggle(m.id)} aria-pressed={!hidden.has(m.id)} data-testid="cmp-legend-item">
              <span className="cmp-legend__swatch" style={{ background: m.color }} />
              {m.name}
            </button>
          ))}
          {benchOk && (
            <span className="cmp-legend__item cmp-legend__bench" data-testid="cmp-legend-benchmark">
              <span className="cmp-bench__swatch" /> Referencia: {data.benchmark.name}
            </span>
          )}
        </div>
      </header>

      <ResponsiveContainer width="100%" height={340}>
        <LineChart data={values} syncId="cmp" margin={{ top: 10, right: 4, left: 4, bottom: 0 }}>
          <CartesianGrid stroke="#EDF0F7" vertical={false} />
          <XAxis dataKey="date" tickFormatter={fmt} tick={AXIS} axisLine={false} tickLine={false} minTickGap={48} dy={8} />
          <YAxis orientation="right" domain={['auto', 'auto']} tick={AXIS} axisLine={false} tickLine={false} width={48}
                 tickFormatter={v => v.toLocaleString('es-ES', { maximumFractionDigits: 0 })} />
          <ReferenceLine y={100} stroke="#8890AA" strokeDasharray="4 4" />
          <Tooltip content={<ValueTooltip meta={visible} />} cursor={{ stroke: '#0E1530', strokeOpacity: 0.25, strokeDasharray: '4 4' }} />
          {visible.map(m => (
            <Line key={m.id} type="monotone" dataKey={m.id} name={m.name} stroke={m.color} strokeWidth={2.2}
                  dot={false} activeDot={{ r: 4, stroke: '#fff', strokeWidth: 2 }} isAnimationActive={false} />
          ))}
          {benchOk && (
            <Line type="monotone" dataKey="__bench" name={data.benchmark.name} stroke={BENCH_COLOR} strokeWidth={1.6}
                  strokeDasharray="6 4" dot={false} connectNulls isAnimationActive={false} />
          )}
        </LineChart>
      </ResponsiveContainer>

      <div className="cmp-chart__dd-head">
        <span className="cmp-section-title cmp-section-title--sm">
          Caída desde máximos
          <InfoTip title="Drawdown">
            Para cada día, cuánto estaba la estrategia por debajo de su máximo anterior. El punto más bajo
            de cada línea es su máxima caída: la peor pérdida temporal que habría sufrido.
          </InfoTip>
        </span>
      </div>
      <ResponsiveContainer width="100%" height={150}>
        <LineChart data={dds} syncId="cmp" margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
          <CartesianGrid stroke="#EDF0F7" vertical={false} />
          <XAxis dataKey="date" hide />
          <YAxis orientation="right" domain={[ddFloor, 0]} ticks={[ddFloor, ddFloor / 2, 0]} interval={0} tick={AXIS}
                 axisLine={false} tickLine={false} width={48}
                 tickFormatter={v => formatFraction(v, { decimals: Math.abs(v) < 0.1 && v !== 0 ? 1 : 0 })} />
          <Tooltip content={<DdTooltip meta={visible} />} cursor={{ stroke: '#0E1530', strokeOpacity: 0.25, strokeDasharray: '4 4' }} />
          {visible.map(m => (
            <Line key={m.id} type="monotone" dataKey={m.id} stroke={m.color} strokeWidth={1.6} dot={false} isAnimationActive={false} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </section>
  )
}
