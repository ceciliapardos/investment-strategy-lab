import { useEffect, useState } from 'react'
import { formatDay, todayIso } from '../utils/format'
import './PeriodControls.css'

export const PRESETS = [
  { key: '1M', label: '1M', title: '1 mes' },
  { key: '6M', label: '6M', title: '6 meses' },
  { key: 'YTD', label: 'Año actual', title: 'Desde el 1 de enero' },
  { key: '1Y', label: '1A', title: '1 año' },
  { key: '5Y', label: '5A', title: '5 años' },
  { key: '10Y', label: '10A', title: '10 años' },
  { key: 'MAX', label: 'Máx.', title: 'Todo el histórico disponible' },
]

/**
 * Selector de periodo: botones predefinidos o rango de fechas personalizado.
 * range = { period } | { start, end }
 */
export default function PeriodControls({ range, onChange, minDate, disabled, presets = PRESETS, minDateLabel }) {
  const isCustom = Boolean(range.start)
  const [showDates, setShowDates] = useState(isCustom)
  const [start, setStart] = useState(range.start || '')
  const [end, setEnd] = useState(range.end || todayIso())
  const [error, setError] = useState(null)
  const max = todayIso()

  useEffect(() => {
    if (range.start) {
      setStart(range.start)
      setEnd(range.end)
    }
  }, [range.start, range.end])

  function applyDates(e) {
    e.preventDefault()
    if (!start || !end) return setError('Indica la fecha inicial y la final.')
    if (start >= end) return setError('La fecha inicial debe ser anterior a la final.')
    if (start > max) return setError('La fecha inicial no puede estar en el futuro.')
    setError(null)
    onChange({ start, end })
  }

  return (
    <div className="period">
      <div className="period__row">
        <div className="period__presets" role="group" aria-label="Periodos predefinidos">
          {presets.map(p => (
            <button
              key={p.key}
              type="button"
              title={p.title}
              disabled={disabled}
              className={`period__btn ${!isCustom && range.period === p.key ? 'period__btn--active' : ''}`}
              aria-pressed={!isCustom && range.period === p.key}
              onClick={() => { setError(null); onChange({ period: p.key }) }}
            >
              {p.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          className={`period__btn period__btn--dates ${isCustom ? 'period__btn--active' : ''}`}
          aria-expanded={showDates}
          onClick={() => setShowDates(s => !s)}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <rect x="2" y="3" width="12" height="11" rx="2" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M2 6.5h12M5.5 1.5v3M10.5 1.5v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          Fechas
        </button>
      </div>

      {showDates && (
        <form className="period__dates" onSubmit={applyDates}>
          <label className="period__field">
            <span>Desde</span>
            <input type="date" value={start} max={max}
                   onChange={e => setStart(e.target.value)} required />
          </label>
          <label className="period__field">
            <span>Hasta</span>
            <input type="date" value={end} max={max}
                   onChange={e => setEnd(e.target.value)} required />
          </label>
          <button type="submit" className="btn-primary period__apply" disabled={disabled}>Aplicar</button>
          {minDate && (
            <p className="period__hint">{minDateLabel || 'Hay datos de este activo desde el'} {formatDay(minDate)}.</p>
          )}
          {error && <p className="period__error" role="alert">{error}</p>}
        </form>
      )}
    </div>
  )
}
