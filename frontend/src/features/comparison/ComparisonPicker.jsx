import { strategyStatus } from '../strategies/model'
import { formatPrice } from '../../utils/format'
import { MAX_SELECTED } from './selection'

/** Tarjetas para elegir qué estrategias comparar (las no válidas explican qué falta). */
export default function ComparisonPicker({ strategies, selected, colors, onToggle, onEdit }) {
  const full = selected.length >= MAX_SELECTED
  return (
    <div className="cmp-picker" role="group" aria-label="Estrategias a comparar">
      {strategies.map(s => {
        const status = strategyStatus(s)
        const checked = selected.includes(s.id)
        const disabled = !status.valid || (full && !checked)
        return (
          <label
            key={s.id}
            className={`cmp-pick ${checked ? 'is-checked' : ''} ${!status.valid ? 'is-invalid' : ''}`}
            style={checked ? { '--pick-color': colors[s.id] } : undefined}
            title={full && !checked && status.valid ? `Máximo ${MAX_SELECTED} estrategias a la vez` : undefined}
            data-testid="cmp-pick"
          >
            <input
              type="checkbox"
              checked={checked}
              disabled={disabled}
              onChange={() => onToggle(s.id)}
              aria-label={`Comparar ${s.name}`}
            />
            <span className="cmp-pick__box" aria-hidden="true">{checked ? '✓' : ''}</span>
            <span className="cmp-pick__body">
              <span className="cmp-pick__name">{s.name}</span>
              <span className="cmp-pick__meta num">
                {s.assets.length} {s.assets.length === 1 ? 'activo' : 'activos'}
                {s.initialCapital != null && ` · ${formatPrice(s.initialCapital, 0)} €`}
              </span>
              {!status.valid && (
                <span className="cmp-pick__issue">
                  {status.issues[0]}{' '}
                  <button type="button" className="cmp-link" onClick={e => { e.preventDefault(); onEdit(s.id) }}>
                    Editar
                  </button>
                </span>
              )}
            </span>
          </label>
        )
      })}
    </div>
  )
}
