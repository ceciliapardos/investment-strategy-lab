import InfoTip from '../../components/InfoTip'
import { formatDay, formatFraction, formatPrice } from '../../utils/format'

const tone = v => (v == null ? '' : v > 0 ? 'is-up' : v < 0 ? 'is-down' : '')

/**
 * Tabla comparativa. Las estrategias aparecen en el orden de selección:
 * no se ordenan por resultado ni se señala ninguna como «mejor».
 */
export default function ComparisonTable({ data, colors }) {
  const ppy = data.method.periods_per_year
  return (
    <section className="cmp-table-wrap card" aria-label="Tabla comparativa">
      <h3 className="cmp-section-title">Métricas del periodo común</h3>
      <div className="cmp-table-scroll">
        <table className="cmp-table" data-testid="cmp-table">
          <thead>
            <tr>
              <th scope="col">Estrategia</th>
              <th scope="col" className="num">Capital inicial</th>
              <th scope="col" className="num">Valor final</th>
              <th scope="col" className="num">
                Rentabilidad <InfoTip title="Rentabilidad acumulada">
                  Cuánto habría cambiado el valor de la estrategia en euros entre el primer y el último día del
                  periodo común. Sin aportaciones: valor final ÷ valor inicial − 1. Con aportaciones periódicas se
                  usa la rentabilidad ponderada por el tiempo (TWR): cada día mide cuánto variaron las inversiones
                  ya hechas, sin contar el dinero nuevo aportado.
                </InfoTip>
              </th>
              <th scope="col" className="num">
                CAGR <InfoTip title="CAGR · rentabilidad anualizada">
                  El porcentaje anual constante que, acumulado año tras año, lleva del valor inicial al final.
                  Solo se calcula si el periodo dura al menos 1 año.
                </InfoTip>
              </th>
              <th scope="col" className="num">
                Volatilidad <InfoTip title="Volatilidad anualizada">
                  Cuánto se movía el valor de la estrategia de un día a otro. Desviación típica de las variaciones
                  diarias × √{ppy}.
                </InfoTip>
              </th>
              <th scope="col" className="num">
                Sharpe (rf 0 %) <InfoTip title="Ratio de Sharpe" align="right">
                  Rentabilidad obtenida por cada unidad de volatilidad en este periodo: (media de rentabilidades diarias
                  × {ppy} − tasa libre de riesgo) ÷ volatilidad anualizada. Simplificación: tasa libre de riesgo del 0 %;
                  con tipos positivos, el Sharpe real sería menor. Con aportaciones se calcula sobre la rentabilidad TWR.
                </InfoTip>
              </th>
              <th scope="col" className="num">
                Máx. caída <InfoTip title="Máximo drawdown" align="right">
                  La mayor caída que habría sufrido la estrategia desde un máximo previo durante el periodo
                  seleccionado.
                </InfoTip>
              </th>
              <th scope="col" className="num">Activos</th>
              <th scope="col" className="num">
                Mayor peso <InfoTip title="Concentración" align="right">
                  Peso inicial del activo con más peso. Cuanto mayor, más depende la estrategia de un solo activo.
                </InfoTip>
              </th>
            </tr>
          </thead>
          <tbody>
            {data.strategies.map(s => {
              const m = s.metrics
              return (
                <tr key={s.id} data-testid="cmp-row">
                  <th scope="row">
                    <span className="cmp-table__name">
                      <span className="cmp-table__dot" style={{ background: colors[s.id] }} />
                      {s.name}
                    </span>
                  </th>
                  <td className="num">{formatPrice(s.initial_capital, 0)} €</td>
                  <td className="num"><b>{formatPrice(s.final_value, 0)} €</b></td>
                  <td className={`num ${tone(m.total_return)}`}>{formatFraction(m.total_return, { signed: true })}</td>
                  <td className={`num ${tone(m.cagr)}`} title={m.cagr_reason || undefined}>
                    {m.cagr != null ? formatFraction(m.cagr, { signed: true }) : '—'}
                  </td>
                  <td className="num" title={m.volatility_reason || undefined}>
                    {m.volatility != null ? formatFraction(m.volatility) : '—'}
                  </td>
                  <td className="num" title={m.sharpe_reason || undefined} data-testid="cmp-sharpe">
                    {m.sharpe != null ? formatPrice(m.sharpe, 2) : 'No disponible'}
                  </td>
                  <td className="num is-down" title={m.max_drawdown?.peak_date
                    ? `Del ${formatDay(m.max_drawdown.peak_date)} al ${formatDay(m.max_drawdown.trough_date)}` : undefined}>
                    {m.max_drawdown ? formatFraction(m.max_drawdown.value) : '—'}
                  </td>
                  <td className="num">{s.n_assets}</td>
                  <td className="num">{s.largest_weight.ticker} · {s.largest_weight.weight.toLocaleString('es-ES')} %</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {data.strategies.some(s => s.metrics.cagr == null) && (
        <p className="cmp-muted">CAGR «—»: {data.strategies.find(s => s.metrics.cagr == null).metrics.cagr_reason}</p>
      )}
    </section>
  )
}

/**
 * Referencia de mercado: sección SEPARADA de las estrategias del usuario. Solo
 * contexto del mismo periodo; nunca se declara un «ganador».
 */
export function BenchmarkSection({ data, colors }) {
  const b = data.benchmark
  if (!b) return null
  const m = b.metrics
  return (
    <section className="cmp-table-wrap card cmp-bench" aria-label="Referencia de mercado" data-testid="cmp-benchmark">
      <div className="cmp-chart__head">
        <h3 className="cmp-section-title">
          Tus estrategias vs. referencia de mercado
          <InfoTip title="Índice de referencia">
            Sirve solo para contextualizar: muestra cómo se comportó el mercado en el mismo periodo. No forma parte de
            ninguna estrategia ni recibe sus aportaciones (comprar y mantener desde el primer día, en euros).
          </InfoTip>
        </h3>
        <span className="cmp-bench__badge" data-testid="cmp-benchmark-kind">{b.kind_label}</span>
      </div>
      <p className="cmp-muted"><b>{b.name}</b> · serie de Yahoo Finance <code>{b.ticker}</code>. {b.description}</p>
      {b.status !== 'ok' ? (
        <p className="notice notice--warn" data-testid="cmp-benchmark-unavailable">{b.message}</p>
      ) : (
        <>
          <div className="cmp-table-scroll">
            <table className="cmp-table" data-testid="cmp-benchmark-table">
              <thead>
                <tr>
                  <th scope="col">Referencia</th>
                  <th scope="col" className="num">Rentabilidad</th>
                  <th scope="col" className="num">CAGR</th>
                  <th scope="col" className="num">Volatilidad</th>
                  <th scope="col" className="num">Sharpe (rf 0 %)</th>
                  <th scope="col" className="num">Máx. caída</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row"><span className="cmp-table__name"><span className="cmp-bench__swatch" />{b.name}</span></th>
                  <td className={`num ${tone(m.total_return)}`}>{formatFraction(m.total_return, { signed: true })}</td>
                  <td className={`num ${tone(m.cagr)}`} title={m.cagr_reason || undefined}>{m.cagr != null ? formatFraction(m.cagr, { signed: true }) : '—'}</td>
                  <td className="num">{m.volatility != null ? formatFraction(m.volatility) : '—'}</td>
                  <td className="num" title={m.sharpe_reason || undefined}>{m.sharpe != null ? formatPrice(m.sharpe, 2) : 'No disponible'}</td>
                  <td className="num is-down">{m.max_drawdown ? formatFraction(m.max_drawdown.value) : '—'}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <ul className="cmp-bench__lines" data-testid="cmp-benchmark-lines">
            {data.strategies.map(s => (
              <li key={s.id}>
                <span className="cmp-table__dot" style={{ background: colors[s.id] }} />
                Del {formatDay(b.effective.start)} al {formatDay(b.effective.end)}, <b>{s.name}</b> obtuvo una rentabilidad
                de {formatFraction(s.metrics.total_return, { signed: true })}{data.method.contributions ? ' (TWR)' : ''} frente
                a {formatFraction(m.total_return, { signed: true })} de la referencia, con una máxima caída
                de {s.metrics.max_drawdown ? formatFraction(s.metrics.max_drawdown.value) : '—'} frente
                a {m.max_drawdown ? formatFraction(m.max_drawdown.value) : '—'}.
              </li>
            ))}
          </ul>
          <p className="cmp-muted">
            Comparación histórica de un periodo concreto: con otro periodo el resultado puede ser distinto. La
            referencia no paga comisiones ni recibe aportaciones; si una estrategia tiene aportaciones, su rentabilidad
            (TWR) ya excluye el dinero aportado.
          </p>
        </>
      )}
    </section>
  )
}

const FREQ = { monthly: 'mes', quarterly: 'trimestre', annual: 'año' }

/**
 * Dinero aportado frente a valor final. Solo aparece si alguna estrategia
 * tiene aportaciones periódicas: deja claro que aportar ≠ ganar.
 */
export function ContributionsTable({ data, colors }) {
  if (!data.method?.contributions) return null
  return (
    <section className="cmp-table-wrap card" aria-label="Aportaciones y resultado" data-testid="cmp-contrib">
      <h3 className="cmp-section-title">
        Dinero aportado y resultado
        <InfoTip title="Aportaciones ≠ rentabilidad">
          Si aportas 1.000 € y la cartera pasa de 10.000 € a 11.000 €, no has ganado un 10 %: ese aumento es tu
          propio dinero. Por eso aquí se separa lo que aportaste de lo que ganaste o perdiste.
        </InfoTip>
      </h3>
      <div className="cmp-table-scroll">
        <table className="cmp-table" data-testid="cmp-contrib-table">
          <thead>
            <tr>
              <th scope="col">Estrategia</th>
              <th scope="col" className="num">Capital inicial</th>
              <th scope="col" className="num">Aportaciones</th>
              <th scope="col" className="num">Total aportado</th>
              <th scope="col" className="num">Valor final</th>
              <th scope="col" className="num">Ganancia / pérdida</th>
              <th scope="col" className="num">Rentabilidad (TWR)</th>
            </tr>
          </thead>
          <tbody>
            {data.strategies.map(s => {
              const c = s.contributions
              return (
                <tr key={s.id} data-testid="cmp-contrib-row">
                  <th scope="row">
                    <span className="cmp-table__name">
                      <span className="cmp-table__dot" style={{ background: colors[s.id] }} />
                      {s.name}
                    </span>
                    {c.planned.length > 0 && (
                      <span className="cmp-sub">
                        {c.planned.map(p => `${p.ticker} ${formatPrice(p.amount, 0)} €/${FREQ[p.frequency]}`).join(' · ')}
                      </span>
                    )}
                  </th>
                  <td className="num">{formatPrice(s.initial_capital, 0)} €</td>
                  <td className="num">
                    {formatPrice(c.total, 0)} €
                    <span className="cmp-sub">{c.count} {c.count === 1 ? 'aportación' : 'aportaciones'}</span>
                  </td>
                  <td className="num"><b>{formatPrice(c.total_contributed, 0)} €</b></td>
                  <td className="num"><b>{formatPrice(s.final_value, 0)} €</b></td>
                  <td className={`num ${tone(c.gain)}`} data-testid="cmp-contrib-gain">
                    {c.gain > 0 ? '+' : ''}{formatPrice(c.gain, 0)} €
                  </td>
                  <td className={`num ${tone(s.metrics.total_return)}`}>{formatFraction(s.metrics.total_return, { signed: true })}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="cmp-muted">
        Ganancia / pérdida = valor final − total aportado. La rentabilidad (TWR) no cambia por aportar más o menos
        dinero: mide cómo se comportaron las inversiones. Las aportaciones se ejecutan el primer día de mercado en o
        después de la misma fecha de cada mes, trimestre o año.
      </p>
    </section>
  )
}
