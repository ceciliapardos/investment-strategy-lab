import InfoTip from './InfoTip'
import { formatDay, formatFraction, formatPrice } from '../utils/format'
import './MetricsPanel.css'

function Metric({ label, tip, value, tone, sub, reason, align = 'left' }) {
  return (
    <article className={`metric ${tone ? `metric--${tone}` : ''}`}>
      <header className="metric__label">
        {label}
        <InfoTip title={tip.title} align={align}>{tip.body}</InfoTip>
      </header>
      <div className="metric__value num">{value}</div>
      {sub && <p className="metric__sub">{sub}</p>}
      {reason && <p className="metric__reason">{reason}</p>}
    </article>
  )
}

const toneOf = v => (v == null ? null : v > 0 ? 'up' : v < 0 ? 'down' : null)

export default function MetricsPanel({ data }) {
  const m = data.metrics
  const mdd = m.max_drawdown
  const sqrtN = m.periods_per_year === 365 ? '√365 (cotiza todos los días)' : '√252 (sesiones de bolsa al año)'

  return (
    <div className="metrics">
      <Metric
        label="Rentabilidad total"
        tone={toneOf(m.total_return)}
        value={formatFraction(m.total_return, { signed: true })}
        sub={m.price_return != null && m.price_return !== m.total_return
          ? `Solo por precio: ${formatFraction(m.price_return, { signed: true })} · la diferencia son los dividendos`
          : 'Del primer al último cierre del periodo'}
        tip={{
          title: 'Rentabilidad total acumulada',
          body: <>Cuánto habría cambiado el valor de una inversión entre el primer y el último día del periodo, suponiendo que los dividendos se reinvierten.<br /><br /><b>Cálculo:</b> valor ajustado final ÷ valor ajustado inicial − 1.</>,
        }}
      />
      <Metric
        label="Rentabilidad anualizada (CAGR)"
        tone={toneOf(m.cagr)}
        value={m.cagr != null ? formatFraction(m.cagr, { signed: true }) : '—'}
        sub={m.cagr != null ? 'Ritmo medio anual compuesto' : null}
        reason={m.cagr_reason}
        tip={{
          title: 'CAGR · tasa de crecimiento anual compuesta',
          body: <>El porcentaje anual constante que, acumulado año tras año, llevaría del valor inicial al final. No significa que cada año se ganara eso.<br /><br /><b>Cálculo:</b> (final ÷ inicial)<sup>1/años</sup> − 1, con años = días naturales ÷ 365,25. Solo se muestra si el periodo dura al menos 1 año.</>,
        }}
      />
      <Metric
        label="Volatilidad anualizada"
        value={m.volatility != null ? formatFraction(m.volatility) : '—'}
        sub={m.volatility != null ? `Con ${data.observations - 1} variaciones diarias` : null}
        reason={m.volatility_reason}
        tip={{
          title: 'Volatilidad',
          body: <>Mide cuánto se mueve el precio de un día a otro. Cuanto más alta, más grandes han sido las subidas y bajadas, y más incierto el camino.<br /><br /><b>Cálculo:</b> desviación típica de las rentabilidades diarias × {sqrtN}.</>,
        }}
      />
      <Metric
        label="Ratio de Sharpe (rf 0 %)"
        value={m.sharpe != null ? formatPrice(m.sharpe, 2) : 'No disponible'}
        sub={m.sharpe != null ? 'Rentabilidad por unidad de volatilidad' : null}
        reason={m.sharpe_reason}
        tip={{
          title: 'Ratio de Sharpe',
          body: <>Cuánta rentabilidad se obtuvo por cada unidad de riesgo (volatilidad). Más alto = mejor relación rentabilidad/riesgo en este periodo, no en el futuro.<br /><br /><b>Cálculo:</b> (media de las rentabilidades diarias × N − tasa libre de riesgo) ÷ volatilidad anualizada, con N = {m.periods_per_year}.<br /><br /><b>Simplificación:</b> se usa una tasa libre de riesgo del 0 %. Con tipos de interés positivos, el Sharpe frente a un activo sin riesgo sería menor.</>,
        }}
      />
      <Metric
        align="right"
        label="Máxima caída (drawdown)"
        tone={mdd && mdd.value < 0 ? 'down' : null}
        value={mdd ? formatFraction(mdd.value) : '—'}
        sub={mdd?.peak_date
          ? `Del máximo del ${formatDay(mdd.peak_date)} al mínimo del ${formatDay(mdd.trough_date)}`
          : 'No hubo caídas desde un máximo en este periodo'}
        tip={{
          title: 'Máximo drawdown',
          body: <>La mayor caída desde un máximo hasta el mínimo posterior dentro del periodo. Es la peor pérdida temporal que habría sufrido quien comprara justo en ese máximo.<br /><br /><b>Cálculo:</b> el mínimo de (valor ÷ máximo alcanzado hasta ese día − 1).</>,
        }}
      />
    </div>
  )
}
