import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatDay, formatFraction, formatPrice, parseDay } from '../utils/format'
import './PerformanceChart.css'

const GREEN = '#0E9F6E'
const RED = '#E5484D'
const AXIS = { fontSize: 11, fill: '#8890AA', fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 500 }

function tickFormatter(spanDays) {
  if (spanDays <= 100) return d => formatDay(d, { day: 'numeric', month: 'short' })
  if (spanDays <= 800) return d => formatDay(d, { month: 'short', year: '2-digit' })
  return d => formatDay(d, { year: 'numeric' })
}

function compact(v) {
  if (Math.abs(v) >= 10000) return `${(v / 1000).toLocaleString('es-ES', { maximumFractionDigits: 0 })}k`
  if (Math.abs(v) >= 1000) return `${(v / 1000).toLocaleString('es-ES', { maximumFractionDigits: 1 })}k`
  return v.toLocaleString('es-ES', { maximumFractionDigits: v < 10 ? 2 : 0 })
}

function ChartTooltip({ active, payload, currency }) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  return (
    <div className="pchart__tooltip">
      <div className="pchart__tooltip-date">{formatDay(p.date, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</div>
      <div className="pchart__tooltip-row">
        <span>Valor ajustado</span><b className="num">{formatPrice(p.adj)} {currency}</b>
      </div>
      {p.close != null && (
        <div className="pchart__tooltip-row pchart__tooltip-row--muted">
          <span>Cierre cotizado</span><span className="num">{formatPrice(p.close)} {currency}</span>
        </div>
      )}
      <div className="pchart__tooltip-row pchart__tooltip-row--muted">
        <span>Caída desde máximo</span>
        <span className="num" style={{ color: p.dd < 0 ? '#FF9A9D' : undefined }}>{formatFraction(p.dd, { decimals: 1 })}</span>
      </div>
    </div>
  )
}

export default function PerformanceChart({ data, currency }) {
  const series = data.series
  const up = (data.metrics?.total_return ?? 0) >= 0
  const color = up ? GREEN : RED
  const first = parseDay(series[0].date)
  const last = parseDay(series[series.length - 1].date)
  const spanDays = (last - first) / 86400000
  const fmt = tickFormatter(spanDays)

  const values = series.map(p => p.adj)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const pad = (max - min) * 0.08 || max * 0.02
  // Eje de caídas con marcas "redondas" (p. ej. -10 %, -5 %, 0 %).
  const rawMinDd = Math.min(...series.map(p => p.dd), -0.01)
  const ddStep = rawMinDd < -0.4 ? 0.2 : rawMinDd < -0.2 ? 0.1 : 0.05
  const ddFloor = Math.floor(rawMinDd / ddStep) * ddStep
  const ddTicks = [ddFloor, ddFloor / 2, 0]
  const mdd = data.metrics?.max_drawdown

  return (
    <section className="pchart card" aria-label="Gráfico de evolución">
      <header className="pchart__head">
        <div>
          <h3 className="pchart__title">Evolución del valor ajustado</h3>
          <p className="pchart__subtitle">Cierres diarios ajustados por dividendos y splits · {currency}</p>
        </div>
        {mdd?.peak_date && (
          <span className="pchart__legend">
            <i className="pchart__legend-swatch" /> Periodo de máxima caída
          </span>
        )}
      </header>

      <ResponsiveContainer width="100%" height={320}>
        <AreaChart data={series} syncId="perf" margin={{ top: 10, right: 4, left: 4, bottom: 0 }}>
          <defs>
            <linearGradient id="pchartFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.28} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#EDF0F7" vertical={false} />
          {mdd?.peak_date && (
            <ReferenceArea x1={mdd.peak_date} x2={mdd.trough_date} fill={RED} fillOpacity={0.07} ifOverflow="extendDomain" />
          )}
          <XAxis dataKey="date" tickFormatter={fmt} tick={AXIS} axisLine={false} tickLine={false} minTickGap={48} dy={8} />
          <YAxis orientation="right" domain={[Math.max(0, min - pad), max + pad]} tickFormatter={compact}
                 tick={AXIS} axisLine={false} tickLine={false} width={56} />
          <Tooltip content={<ChartTooltip currency={currency} />} cursor={{ stroke: '#0E1530', strokeOpacity: 0.25, strokeDasharray: '4 4' }} />
          <Area type="monotone" dataKey="adj" stroke={color} strokeWidth={2.2} fill="url(#pchartFill)" dot={false}
                activeDot={{ r: 4.5, fill: color, stroke: '#fff', strokeWidth: 2 }} isAnimationActive animationDuration={500} />
        </AreaChart>
      </ResponsiveContainer>

      <div className="pchart__dd-head">
        <span>Caída desde máximos</span>
        <span className="pchart__dd-hint">Cuánto estaba por debajo de su máximo anterior cada día</span>
      </div>
      <ResponsiveContainer width="100%" height={110}>
        <AreaChart data={series} syncId="perf" margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
          <defs>
            <linearGradient id="pchartDd" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={RED} stopOpacity={0.05} />
              <stop offset="100%" stopColor={RED} stopOpacity={0.35} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#EDF0F7" vertical={false} />
          <XAxis dataKey="date" hide />
          <YAxis orientation="right" domain={[ddFloor, 0]} ticks={ddTicks} interval={0}
                 tickFormatter={v => formatFraction(v, { decimals: Math.abs(v) < 0.1 && v !== 0 ? 1 : 0 })}
                 tick={AXIS} axisLine={false} tickLine={false} width={56} />
          <Tooltip content={() => null} cursor={{ stroke: '#0E1530', strokeOpacity: 0.25, strokeDasharray: '4 4' }} />
          <Area type="monotone" dataKey="dd" stroke={RED} strokeWidth={1.5} fill="url(#pchartDd)" dot={false} isAnimationActive={false} baseValue={0} />
        </AreaChart>
      </ResponsiveContainer>
    </section>
  )
}
