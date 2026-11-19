import { useEffect, useState } from 'react'
import TypeBadge from '../../components/TypeBadge'
import { isFavorite, loadFavorites, removeFavorite, saveFavorites, toggleFavorite } from './favorites'
import './FavoritesUI.css'

/** Estado de «Mi lista» guardado en el navegador. */
export function useFavorites() {
  const [items, setItems] = useState(() => loadFavorites())
  useEffect(() => { saveFavorites(items) }, [items])
  return {
    items,
    isFavorite: ticker => isFavorite(items, ticker),
    toggle: asset => setItems(list => toggleFavorite(list, asset)),
    remove: ticker => setItems(list => removeFavorite(list, ticker)),
  }
}

const StarIcon = ({ filled }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 3.6l2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z"
          fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
  </svg>
)

/** Botón discreto para añadir o quitar el activo abierto de «Mi lista». */
export function FavoriteButton({ active, onToggle }) {
  return (
    <button type="button" className={`fav-btn ${active ? 'is-active' : ''}`} onClick={onToggle}
            aria-pressed={active} data-testid="fav-toggle">
      <StarIcon filled={active} />
      {active ? 'En Mi lista' : 'Añadir a Mi lista'}
    </button>
  )
}

/** Lista de favoritos: abrir un activo o quitarlo. */
export function FavoritesList({ items, onOpen, onRemove }) {
  return (
    <section className="fav-list card" aria-labelledby="fav-title" data-testid="fav-list">
      <div className="fav-list__head">
        <h2 id="fav-title" className="fav-list__title"><StarIcon filled /> Mi lista</h2>
        <span className="fav-list__count num">{items.length}</span>
      </div>
      {items.length === 0 ? (
        <p className="fav-list__empty" data-testid="fav-empty">
          Aún no has guardado ningún activo. Abre uno y pulsa «Añadir a Mi lista» para tenerlo a mano.
        </p>
      ) : (
        <ul className="fav-list__items">
          {items.map(f => (
            <li key={f.ticker} className="fav-item" data-testid="fav-item">
              <button type="button" className="fav-item__open" onClick={() => onOpen(f.ticker)} data-testid="fav-open">
                <span className="fav-item__ticker">{f.ticker}</span>
                <span className="fav-item__name">{f.name}</span>
                {f.type && <TypeBadge type={f.type} size="sm" />}
              </button>
              <button type="button" className="fav-item__remove" onClick={() => onRemove(f.ticker)}
                      aria-label={`Quitar ${f.ticker} de Mi lista`} data-testid="fav-remove">✕</button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
