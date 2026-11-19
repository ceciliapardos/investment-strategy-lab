import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { fmtPct } from './model'
import { colorAt, UNASSIGNED_COLOR } from './palette'

function SliceTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  return (
    <div className="sb-donut__tip">
      <b>{p.label}</b>
      <span className="num">{fmtPct(p.value)}</span>
    </div>
  )
}

/** Donut de la composición. Se actualiza en cuanto cambian los pesos. */
export default function CompositionChart({ strategy, alloc }) {
  const slices = strategy.assets
    .map((a, i) => ({ label: a.ticker, value: a.weight, color: colorAt(i) }))
    .filter(s => Number.isFinite(s.value) && s.value > 0)

  const data = [...slices]
  if (alloc.status === 'under' && alloc.remaining > 0) {
    data.push({ label: 'Sin asignar', value: alloc.remaining, color: UNASSIGNED_COLOR, unassigned: true })
  }
  const empty = data.length === 0

  return (
    <div className="sb-donut" data-testid="composition">
      <div className="sb-donut__chart">
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={empty ? [{ label: 'Vacía', value: 1, color: UNASSIGNED_COLOR }] : data}
              dataKey="value"
              nameKey="label"
              innerRadius="68%"
              outerRadius="98%"
              paddingAngle={empty || data.length === 1 ? 0 : 1.5}
              stroke="none"
              startAngle={90}
              endAngle={-270}
              isAnimationActive
              animationDuration={400}
            >
              {(empty ? [{ color: UNASSIGNED_COLOR }] : data).map((d, i) => <Cell key={i} fill={d.color} />)}
            </Pie>
            {!empty && <Tooltip content={<SliceTooltip />} />}
          </PieChart>
        </ResponsiveContainer>
        <div className={`sb-donut__center ${alloc.status === 'over' ? 'is-over' : alloc.status === 'exact' ? 'is-ok' : ''}`}>
          <span className="sb-donut__total num" data-testid="composition-total">{fmtPct(alloc.total)}</span>
          <span className="sb-donut__caption">asignado</span>
        </div>
      </div>

      {alloc.status === 'over' && (
        <p className="sb-donut__note">La suma supera el 100 %: el gráfico muestra las proporciones relativas.</p>
      )}

      {slices.length > 0 && (
        <ul className="sb-legend">
          {data.map(d => (
            <li key={d.label} className={d.unassigned ? 'sb-legend__item is-unassigned' : 'sb-legend__item'}>
              <span className="sb-legend__dot" style={{ background: d.color }} />
              <span className="sb-legend__label">{d.label}</span>
              <span className="sb-legend__value num">{fmtPct(d.value)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
