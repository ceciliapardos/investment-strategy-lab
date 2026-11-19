import { useState } from 'react'
import './SearchBar.css'

export default function SearchBar({
  onSearch,
  loading,
  placeholder = 'Buscar ticker o nombre — p. ej. TSLA, VOO, AAPL...',
  ariaLabel = 'Buscar activo',
  buttonLabel = 'Buscar',
  minLength = 1,
  maxLength = 60,
  variant = 'hero', // 'hero' (sobre fondo oscuro) | 'light' (dentro de una tarjeta)
  testId,
}) {
  const [value, setValue] = useState('')

  // Enter ya dispara onSubmit del formulario (no hace falta onKeyDown).
  function handleSubmit(e) {
    e.preventDefault()
    const q = value.trim()
    if (q.length >= minLength) onSearch(q)
  }

  return (
    <form className={`searchbar searchbar--${variant}`} onSubmit={handleSubmit} role="search" data-testid={testId}>
      <div className="searchbar__input-wrap">
        <svg className="searchbar__icon" width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
          <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.6"/>
          <path d="M12.5 12.5L16 16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
        </svg>
        <input
          className="searchbar__input"
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={e => setValue(e.target.value)}
          maxLength={maxLength}
          autoComplete="off"
          spellCheck={false}
          aria-label={ariaLabel}
        />
        {value && (
          <button
            type="button"
            className="searchbar__clear"
            onClick={() => setValue('')}
            aria-label="Borrar búsqueda"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
          </button>
        )}
      </div>
      <button
        type="submit"
        className="btn-primary searchbar__btn"
        disabled={value.trim().length < minLength || loading}
      >
        {loading ? 'Buscando...' : buttonLabel}
      </button>
    </form>
  )
}
