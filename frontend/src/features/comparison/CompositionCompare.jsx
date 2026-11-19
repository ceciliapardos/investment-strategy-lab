import TypeBadge from '../../components/TypeBadge'
import InfoTip from '../../components/InfoTip'
import { formatFraction } from '../../utils/format'

const pct = v => `${v.toLocaleString('es-ES', { maximumFractionDigits: 1 })} %`

/** Composición de cada estrategia: pesos iniciales, pesos finales (buy & hold) y rentabilidad de cada activo en €. */
export default function CompositionCompare({ data, colors }) {
  return (
    <section className="cmp-comp" aria-label="Composición">
      <h3 className="cmp-section-title">
        Composición: al inicio y al final
        <InfoTip title="Buy & hold">
          Se compra al principio según los pesos objetivo y no se vuelve a tocar. Por eso los pesos finales
          cambian: lo que más sube acaba pesando más.
        </InfoTip>
      </h3>
      <div className="cmp-comp__grid">
        {data.strategies.map(s => (
          <article key={s.id} className="cmp-comp__card card" data-testid="cmp-composition">
            <header className="cmp-comp__head">
              <span className="cmp-table__dot" style={{ background: colors[s.id] }} />
              <b>{s.name}</b>
            </header>
            <table className="cmp-comp__table">
              <thead>
                <tr>
                  <th scope="col">Activo</th>
                  <th scope="col" className="num">Inicial</th>
                  <th scope="col" className="num">Final</th>
                  <th scope="col" className="num">Rent. en €</th>
                </tr>
              </thead>
              <tbody>
                {s.composition.map(c => (
                  <tr key={c.ticker}>
                    <td>
                      <span className="cmp-comp__ticker">{c.ticker}</span>
                      <span className="cmp-comp__meta"><TypeBadge type={c.type} size="sm" /> {c.currency}</span>
                    </td>
                    <td className="num">
                      {pct(c.initial_weight)}
                      <span className="cmp-comp__bar"><span style={{ width: `${c.initial_weight}%`, background: colors[s.id] }} /></span>
                    </td>
                    <td className="num">
                      {pct(c.final_weight)}
                      <span className="cmp-comp__bar"><span style={{ width: `${c.final_weight}%`, background: colors[s.id], opacity: 0.55 }} /></span>
                    </td>
                    <td className={`num ${c.return_eur > 0 ? 'is-up' : c.return_eur < 0 ? 'is-down' : ''}`}>
                      {formatFraction(c.return_eur, { signed: true, decimals: 1 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </article>
        ))}
      </div>
    </section>
  )
}
