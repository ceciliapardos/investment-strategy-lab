import { formatFraction, formatPrice, formatTer, ASSET_TYPE_LABEL } from '../../utils/format'
import { BrokerCostsTip, CustodyTip, ExitTip, FxTip, TerTip } from './tips'
import { CATEGORY_LABEL, MARKET_LABEL, barWidth, duringRows, exitRows, formatSourceDate } from './model'

const eur = (v, d = 2) => `${formatPrice(v, d)} €`
const pct = v => (v == null ? '—' : formatFraction(v, { decimals: 2 }))
const tone = v => (v == null ? '' : v > 0 ? 'is-up' : v < 0 ? 'is-down' : '')
const signedEur = v => `${v > 0 ? '+' : ''}${formatPrice(v, 0)} €`
const uncoveredText = c => c.uncovered.map(u => `${u.ticker} (${u.reason})`).join(', ')
const hasContributions = data => data.strategies.some(s => s.n_contributions > 0)

/** Tabla resumen: una fila por estrategia, en el orden de selección (sin ganador). */
export function CostSummaryTable({ data, scenario, colors }) {
  const sc = data.scenarios.find(s => s.id === scenario)
  const contrib = hasContributions(data)
  return (
    <section className="cmp-table-wrap card" aria-label="Resumen de costes">
      <h3 className="cmp-section-title">Resumen · {sc?.name}</h3>
      <div className="cmp-table-scroll">
        <table className="cmp-table cost-table" data-testid="cost-table">
          <thead>
            <tr>
              <th scope="col">Estrategia</th>
              <th scope="col" className="num">{contrib ? 'Total aportado' : 'Capital inicial'}</th>
              <th scope="col" className="num">Resultado antes de costes del intermediario</th>
              <th scope="col" className="num">Costes durante la inversión <BrokerCostsTip /></th>
              <th scope="col" className="num">Resultado después de costes del intermediario</th>
              <th scope="col" className="num">Coste estimado de salida <ExitTip align="right" /></th>
              <th scope="col" className="num">Resultado tras la salida</th>
            </tr>
          </thead>
          <tbody>
            {data.strategies.map(s => {
              const c = s.costs[scenario]
              const trades = c.trades.initial + c.trades.periodic
              return (
                <tr key={s.id} data-testid="cost-row">
                  <th scope="row">
                    <span className="cmp-table__name">
                      <span className="cmp-table__dot" style={{ background: colors[s.id] }} />
                      {s.name}
                    </span>
                    {!c.complete && <span className="cost-badge cost-badge--warn" title={`Sin tarifa para ${uncoveredText(c)}`}>Datos incompletos</span>}
                    <span className="cost-sub">{trades} {trades === 1 ? 'compra' : 'compras'}{c.trades.periodic ? ` (${c.trades.periodic} periódicas)` : ''}</span>
                  </th>
                  <td className="num">
                    {eur(s.total_contributed, 0)}
                    {s.n_contributions > 0 && <span className="cost-sub">{eur(s.initial_capital, 0)} + {eur(s.contributions_total, 0)}</span>}
                  </td>
                  <td className="num">
                    <b>{eur(s.gross_final)}</b>
                    <span className={`cost-sub ${tone(s.gross_gain)}`}>{signedEur(s.gross_gain)}</span>
                  </td>
                  <td className="num">
                    <b data-testid="cost-during">{eur(c.during.total)}</b>
                    <span className="cost-sub">{pct(c.during_pct_contributed)} de lo aportado</span>
                  </td>
                  <td className="num">
                    <b data-testid="cost-net">{eur(c.net_final)}</b>
                    <span className={`cost-sub ${tone(c.net_gain)}`}>{signedEur(c.net_gain)}</span>
                  </td>
                  <td className="num">{eur(c.exit.total)}</td>
                  <td className="num">
                    {eur(c.net_after_exit)}
                    <span className={`cost-sub ${tone(c.net_after_exit_gain)}`}>{signedEur(c.net_after_exit_gain)}</span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="cmp-muted">
        Las estrategias aparecen en el orden en que las seleccionaste. El «resultado antes de costes del intermediario»
        es el mismo valor final que en Strategy Comparison. Debajo de cada resultado: ganancia o pérdida en euros
        frente a todo lo aportado (no es una rentabilidad).
      </p>
    </section>
  )
}

/**
 * Barras antes/después en una escala común que empieza en 0 €: una diferencia
 * pequeña se ve pequeña. La cifra exacta del impacto acompaña a cada par.
 */
export function ImpactBars({ data, scenario, colors }) {
  const max = Math.max(...data.strategies.map(s => Math.max(s.gross_final, s.costs[scenario].net_final)))
  return (
    <section className="card cost-impact" aria-label="Impacto de los costes" data-testid="cost-impact">
      <div className="cmp-chart__head">
        <h3 className="cmp-section-title">Antes y después de costes del intermediario</h3>
        <span className="cmp-muted">Escala común desde 0 € · los costes de salida no se incluyen aquí</span>
      </div>
      <div className="cost-impact__list">
        {data.strategies.map(s => {
          const c = s.costs[scenario]
          return (
            <div key={s.id} className="cost-impact__item">
              <div className="cost-impact__head">
                <span className="cmp-table__name"><span className="cmp-table__dot" style={{ background: colors[s.id] }} />{s.name}</span>
                <span className="cost-impact__delta num" data-testid="cost-impact-delta">
                  Impacto: −{eur(c.impact)} <span className="cmp-muted">({pct(c.impact_pct_contributed)} de lo aportado)</span>
                </span>
              </div>
              <div className="cost-bar">
                <span className="cost-bar__label">Antes</span>
                <span className="cost-bar__track"><span className="cost-bar__fill cost-bar__fill--gross" style={{ width: `${barWidth(s.gross_final, max)}%` }} /></span>
                <span className="cost-bar__value num">{eur(s.gross_final, 0)}</span>
              </div>
              <div className="cost-bar">
                <span className="cost-bar__label">Después</span>
                <span className="cost-bar__track"><span className="cost-bar__fill" style={{ width: `${barWidth(c.net_final, max)}%`, background: colors[s.id] }} /></span>
                <span className="cost-bar__value num">{eur(c.net_final, 0)}</span>
              </div>
            </div>
          )
        })}
      </div>
      <p className="cmp-muted">
        El impacto incluye lo pagado y lo que ese dinero habría ganado: una comisión de compra reduce lo que se invierte
        desde ese día.
      </p>
    </section>
  )
}

/** Desglose por estrategia: costes durante la inversión y, aparte, coste estimado de salida. */
export function CostBreakdown({ data, scenario, colors }) {
  const labels = { custody: <CustodyTip />, fx: <FxTip /> }
  return (
    <section className="cost-breakdown" aria-label="Desglose de costes">
      <h3 className="cmp-section-title">Desglose por estrategia</h3>
      {hasContributions(data) && (
        <p className="notice notice--info cost-edu" data-testid="cost-edu">
          <span aria-hidden="true">ℹ</span>
          <span>
            Con aportaciones periódicas, una comisión por operación se repite cada vez que realizas una nueva compra.
            Una comisión pequeña puede pesar poco con una sola compra y bastante más con muchas.
          </span>
        </p>
      )}
      <div className="cmp-comp__grid">
        {data.strategies.map(s => {
          const c = s.costs[scenario]
          return (
            <article key={s.id} className="card cost-card" data-testid="cost-card">
              <header className="cmp-comp__head">
                <span className="cmp-table__dot" style={{ background: colors[s.id] }} />
                <b>{s.name}</b>
              </header>
              {!c.complete && (
                <p className="notice notice--warn cost-card__warn" data-testid="cost-incomplete">
                  Datos de intermediario incompletos: esta tarifa no cubre {uncoveredText(c)}. Su coste no está incluido.
                </p>
              )}
              <table className="cost-lines">
                <caption>Costes durante la inversión</caption>
                <tbody>
                  {duringRows(c).map(r => (
                    <tr key={r.key}>
                      <th scope="row">{r.label} {labels[r.key]}</th>
                      <td className="num">{eur(r.value)}</td>
                    </tr>
                  ))}
                  <tr className="cost-lines__total">
                    <th scope="row">Total durante la inversión</th>
                    <td className="num" data-testid="cost-card-total">{eur(c.during.total)}</td>
                  </tr>
                </tbody>
              </table>
              <p className="cost-card__pcts cmp-muted num">
                {pct(c.during_pct_contributed)} de todo lo aportado · {pct(c.during_pct_final)} del valor final antes de costes
              </p>
              {c.notes?.map(n => <p key={n} className="cost-card__note" data-testid="cost-note">⚠ {n}</p>)}
              <table className="cost-lines cost-lines--exit">
                <caption>Coste estimado de salida <ExitTip /></caption>
                <tbody>
                  {exitRows(c).map(r => (
                    <tr key={r.key}><th scope="row">{r.label}</th><td className="num">{eur(r.value)}</td></tr>
                  ))}
                  <tr className="cost-lines__total">
                    <th scope="row">Total si se vendiera todo</th>
                    <td className="num">{eur(c.exit.total)}</td>
                  </tr>
                </tbody>
              </table>
              <details className="cost-positions">
                <summary>Ver por activo</summary>
                <table className="cmp-comp__table">
                  <thead><tr><th>Activo</th><th>Mercado</th><th className="num">Compras</th><th className="num">Comisión</th><th className="num">Divisa</th><th className="num">Venta est.</th></tr></thead>
                  <tbody>
                    {c.positions.map(p => (
                      <tr key={p.ticker}>
                        <td><b>{p.ticker}</b></td>
                        <td>{MARKET_LABEL[p.market] || p.market}</td>
                        <td className="num">{p.trades}</td>
                        <td className="num">{eur(p.buy)}</td>
                        <td className="num">{eur(p.fx_buy)}</td>
                        <td className="num">{eur(p.sell + p.fx_sell)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </details>
            </article>
          )
        })}
      </div>
    </section>
  )
}

/** Una estrategia bajo todos los escenarios, agrupados (orden fijo, sin ranking). */
export function BrokerCompare({ data, focus, onFocus }) {
  const s = data.strategies.find(x => x.id === focus) || data.strategies[0]
  const groups = [
    ...Object.entries(CATEGORY_LABEL).map(([k, label]) => ({ label, items: data.scenarios.filter(sc => sc.category === k) })),
    { label: 'Referencia y datos propios', items: data.scenarios.filter(sc => sc.kind !== 'broker') },
  ].filter(g => g.items.length)
  return (
    <section className="cmp-table-wrap card" aria-label="Comparar intermediarios" data-testid="cost-brokers">
      <div className="cmp-chart__head">
        <h3 className="cmp-section-title">Una estrategia, distintos intermediarios</h3>
        {data.strategies.length > 1 && (
          <label className="cost-select">
            <span className="cmp-label">Estrategia</span>
            <select value={s.id} onChange={e => onFocus(e.target.value)} data-testid="cost-focus">
              {data.strategies.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}
            </select>
          </label>
        )}
      </div>
      {s.n_contributions > 0 && (
        <p className="cmp-muted">
          «{s.name}» hace {s.costs.none.trades.initial + s.n_contributions} compras en el periodo
          ({s.n_contributions} periódicas): las tarifas con comisión por operación se repiten en cada una.
        </p>
      )}
      <div className="cmp-table-scroll">
        <table className="cmp-table cost-table">
          <thead>
            <tr>
              <th scope="col">Escenario</th>
              <th scope="col" className="num">Comisiones de compra</th>
              <th scope="col" className="num">Costes durante la inversión</th>
              <th scope="col" className="num">% de lo aportado</th>
              <th scope="col" className="num">Resultado después de costes</th>
              <th scope="col" className="num">Coste estimado de salida</th>
              <th scope="col">Datos</th>
            </tr>
          </thead>
          {groups.map(g => (
            <tbody key={g.label}>
              <tr className="cost-group-row"><th colSpan={7} scope="rowgroup">{g.label}</th></tr>
              {g.items.map(sc => {
                const c = s.costs[sc.id]
                if (!c) return null
                return (
                  <tr key={sc.id} data-testid="cost-broker-row">
                    <th scope="row">
                      {sc.name}
                      {sc.source?.consulted && <span className="cost-sub">Consultadas a {formatSourceDate(sc.source.consulted)}</span>}
                      {sc.kind === 'custom' && <span className="cost-sub">Introducidos por ti</span>}
                    </th>
                    <td className="num">{eur(c.during.buy)}</td>
                    <td className="num">{eur(c.during.total)}</td>
                    <td className="num">{pct(c.during_pct_contributed)}</td>
                    <td className="num"><b>{eur(c.net_final)}</b></td>
                    <td className="num">{eur(c.exit.total)}</td>
                    <td>
                      {c.complete ? 'Completos' : <span className="cost-badge cost-badge--warn">Incompletos</span>}
                      {c.notes?.length > 0 && <span className="cost-sub">Con estimaciones</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          ))}
        </table>
      </div>
      <p className="cmp-muted">
        Orden fijo: bancos tradicionales, brokers y bancos digitales (cada grupo por orden alfabético) y referencias.
        No es un ranking ni una recomendación: las condiciones dependen del tipo de cuenta, del plan y de cada cliente.
      </p>
    </section>
  )
}

/** Costes internos del producto: información, ya incluida en el precio histórico. */
export function ProductCosts({ data }) {
  return (
    <section className="card cost-ter" aria-label="Costes internos del producto" data-testid="cost-ter">
      <h3 className="cmp-section-title">Costes internos del producto <TerTip /></h3>
      <p className="notice notice--info cost-ter__note">
        <span aria-hidden="true">ℹ</span>
        <span>
          <b>Ya reflejados en el precio histórico.</b> El TER de un ETF o fondo se descuenta cada día de su valor, así
          que la rentabilidad histórica ya lo incluye. Aquí se muestra solo como información y <b>no se vuelve a restar</b>.
        </span>
      </p>
      <div className="cmp-table-scroll">
        <table className="cmp-table cost-table cost-table--ter">
          <thead>
            <tr><th scope="col">Activo</th><th scope="col">Tipo</th><th scope="col" className="num">TER</th><th scope="col">Detalle</th></tr>
          </thead>
          <tbody>
            {data.product_costs.map(p => (
              <tr key={p.ticker} data-testid="cost-ter-row">
                <th scope="row">{p.ticker}<span className="cost-sub">{p.name}</span></th>
                <td>{ASSET_TYPE_LABEL[p.type] || p.type}</td>
                <td className="num" data-testid="cost-ter-value">{formatTer({ status: p.ter_status, value: p.ter })}</td>
                <td className="cost-ter__reason">
                  {p.ter_status === 'available'
                    ? 'Fuente: Yahoo Finance (dato publicado del fondo). Consulta el folleto o la ficha del emisor para el valor oficial.'
                    : p.reason}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

/** Fuente y condiciones del intermediario elegido. */
export function ScenarioInfo({ scenario }) {
  if (!scenario || scenario.kind !== 'broker') return null
  const src = scenario.source
  return (
    <details className="explainer card" data-testid="cost-source">
      <summary>
        <span className="explainer__icon" aria-hidden="true">€</span>
        Tarifa de {scenario.name}: qué incluye y de dónde sale
      </summary>
      <div className="explainer__body">
        <p>
          <b>Fuente oficial:</b> {src.publisher} — <a href={src.url} target="_blank" rel="noopener noreferrer">{src.document}</a>
          {src.document_date && <> · documento de {formatSourceDate(src.document_date)}</>}.{' '}
          <b>Tarifas consultadas a {formatSourceDate(src.consulted)}.</b>
        </p>
        {src.extra_urls?.length > 0 && (
          <p>Otras fuentes oficiales: {src.extra_urls.map((u, i) => (
            <span key={u}>{i > 0 && ' · '}<a href={u} target="_blank" rel="noopener noreferrer">{new URL(u).hostname}</a></span>
          ))}</p>
        )}
        <p><b>Perfil tarifario modelado:</b> {scenario.profile}. {scenario.plan}. Instrumentos: {scenario.instruments.map(i => ASSET_TYPE_LABEL[i] || i).join(' y ')}.</p>
        <ul>{scenario.notes.map(n => <li key={n}>{n}</li>)}</ul>
        <p><b>No modelado:</b></p>
        <ul>{scenario.not_modeled.map(n => <li key={n}>{n}</li>)}</ul>
      </div>
    </details>
  )
}
