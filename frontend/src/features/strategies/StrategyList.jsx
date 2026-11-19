import { allocation, LIMITS, strategyStatus } from './model'
import { colorAt } from './palette'
import { formatPrice } from '../../utils/format'

/** Lista de estrategias: lateral en escritorio, fila desplazable en móvil. */
export default function StrategyList({ strategies, activeId, onSelect, onCreate }) {
  const atLimit = strategies.length >= LIMITS.maxStrategies
  return (
    <aside className="sb-list" aria-label="Tus estrategias">
      <div className="sb-list__head">
        <span className="sb-list__title">Tus estrategias <b>{strategies.length}</b></span>
        <button
          type="button"
          className="sb-list__new"
          onClick={onCreate}
          disabled={atLimit}
          title={atLimit ? `Máximo ${LIMITS.maxStrategies} estrategias` : 'Crear una estrategia nueva'}
          data-testid="new-strategy"
        >
          <span aria-hidden="true">＋</span> Nueva
        </button>
      </div>
      {atLimit && <p className="sb-list__limit">Has llegado al máximo de {LIMITS.maxStrategies} estrategias.</p>}

      <ul className="sb-list__items" role="list">
        {strategies.map(s => {
          const { valid } = strategyStatus(s)
          const alloc = allocation(s)
          const active = s.id === activeId
          return (
            <li key={s.id}>
              <button
                type="button"
                className={`sb-item ${active ? 'sb-item--active' : ''}`}
                onClick={() => onSelect(s.id)}
                aria-current={active ? 'true' : undefined}
                data-testid="strategy-item"
              >
                <span className="sb-item__top">
                  <span className="sb-item__name">{s.name}</span>
                  <span className={`sb-dot ${valid ? 'sb-dot--ok' : 'sb-dot--warn'}`} title={valid ? 'Lista' : 'Incompleta'} />
                </span>
                <span className="sb-item__meta num">
                  {s.assets.length} {s.assets.length === 1 ? 'activo' : 'activos'}
                  {s.initialCapital != null && ` · ${formatPrice(s.initialCapital, 0)} €`}
                </span>
                <span className="sb-item__bar" aria-hidden="true">
                  {s.assets.map((a, i) => (
                    Number.isFinite(a.weight) && a.weight > 0 && (
                      <span key={a.ticker} style={{ width: `${Math.min(a.weight, 100) / Math.max(alloc.total, 100) * 100}%`, background: colorAt(i) }} />
                    )
                  ))}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </aside>
  )
}
