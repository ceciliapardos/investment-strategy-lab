import { useEffect, useState } from 'react'
import { LIMITS, NAME_MESSAGES } from './model'

/** Nombre de la estrategia (editable) + estado + acciones. */
export default function StrategyHeader({ strategy, status, onRename, onDuplicate, onDelete, canDuplicate }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(strategy.name)
  const [error, setError] = useState(null)

  useEffect(() => {
    setEditing(false)
    setDraft(strategy.name)
    setError(null)
  }, [strategy.id, strategy.name])

  function save(e) {
    e.preventDefault()
    const err = onRename(draft)
    if (err) return setError(NAME_MESSAGES[err])
    setEditing(false)
    setError(null)
  }

  function cancel() {
    setEditing(false)
    setDraft(strategy.name)
    setError(null)
  }

  return (
    <header className="sb-header">
      <div className="sb-header__main">
        <span className="sb-header__eyebrow">Estás editando</span>
        {editing ? (
          <form className="sb-rename" onSubmit={save}>
            <input
              className={`sb-rename__input ${error ? 'is-invalid' : ''}`}
              value={draft}
              onChange={e => { setDraft(e.target.value); setError(null) }}
              onKeyDown={e => { if (e.key === 'Escape') cancel() }}
              maxLength={LIMITS.nameMax + 10}
              autoFocus
              aria-label="Nombre de la estrategia"
              aria-invalid={Boolean(error)}
              data-testid="rename-input"
            />
            <span className={`sb-rename__count num ${draft.trim().length > LIMITS.nameMax ? 'is-over' : ''}`}>
              {draft.trim().length}/{LIMITS.nameMax}
            </span>
            <button type="submit" className="btn-primary sb-btn-sm" data-testid="rename-save">Guardar</button>
            <button type="button" className="btn-ghost sb-btn-sm" onClick={cancel}>Cancelar</button>
            {error && <p className="sb-field-error" role="alert" data-testid="rename-error">{error}</p>}
          </form>
        ) : (
          <div className="sb-header__title-row">
            <h2 className="sb-header__name" data-testid="strategy-name">{strategy.name}</h2>
            <button type="button" className="sb-icon-btn" onClick={() => setEditing(true)} aria-label="Renombrar estrategia" title="Renombrar" data-testid="rename">
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M11.5 2.5l2 2L6 12l-2.7.7.7-2.7 7.5-7.5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
              </svg>
            </button>
            <span className={`sb-status ${status.valid ? 'sb-status--ok' : 'sb-status--warn'}`} data-testid="strategy-status">
              {status.valid ? '✓ Lista para comparar' : 'Incompleta'}
            </span>
          </div>
        )}
      </div>

      <div className="sb-header__actions">
        <button type="button" className="btn-ghost sb-btn-sm" onClick={onDuplicate} disabled={!canDuplicate} data-testid="duplicate-strategy"
                title={canDuplicate ? 'Crear una copia para probar variaciones' : `Máximo ${LIMITS.maxStrategies} estrategias`}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <rect x="5" y="5" width="9" height="9" rx="2" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M11 5V3.5A1.5 1.5 0 009.5 2h-6A1.5 1.5 0 002 3.5v6A1.5 1.5 0 003.5 11H5" stroke="currentColor" strokeWidth="1.5"/>
          </svg>
          Duplicar
        </button>
        <button type="button" className="btn-ghost sb-btn-sm sb-btn-danger" onClick={onDelete} data-testid="delete-strategy">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.6 8.5h5.8l.6-8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Eliminar
        </button>
      </div>
    </header>
  )
}
