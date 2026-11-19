import InfoTip from '../../components/InfoTip'
import { currenciesOf } from './model'

/** Resumen sencillo: nº de activos, divisas y qué falta. Sin métricas inventadas. */
export default function StrategySummary({ strategy, status }) {
  const currencies = currenciesOf(strategy)
  const foreign = currencies.filter(c => c !== strategy.baseCurrency)

  return (
    <div className="sb-summary">
      <div className="sb-stat">
        <span className="sb-label">
          Activos
          <InfoTip title="Diversificación">
            Repartir el capital entre varios activos puede reducir la dependencia de un
            único activo, aunque no elimina el riesgo. Tener muchos activos no garantiza
            estar diversificado si todos se mueven igual.
          </InfoTip>
        </span>
        <span className="sb-stat__value num" data-testid="asset-count">{strategy.assets.length}</span>
      </div>

      <div className="sb-stat">
        <span className="sb-label">
          Divisas
          <InfoTip title="Divisa de los activos" align="right">
            Tu capital está en euros. Si un activo cotiza en otra moneda, el tipo de
            cambio también influirá en el resultado. Se tendrá en cuenta al comparar
            estrategias.
          </InfoTip>
        </span>
        <span className="sb-stat__value sb-stat__value--sm">{currencies.length ? currencies.join(' · ') : '—'}</span>
      </div>

      <div className="sb-checklist" data-testid="strategy-issues">
        {status.valid ? (
          <p className="sb-check sb-check--ok">✓ Estrategia completa: lista para la futura comparación histórica.</p>
        ) : (
          status.issues.map(i => <p key={i} className="sb-check">• {i}</p>)
        )}
        {foreign.length > 0 && (
          <p className="sb-check sb-check--info">Incluye activos en {foreign.join(', ')}: habrá efecto del tipo de cambio.</p>
        )}
      </div>
    </div>
  )
}
