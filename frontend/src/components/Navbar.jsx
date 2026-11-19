import { Link, NavLink } from 'react-router-dom'
import { MODULES } from '../modules'
import './Navbar.css'

export default function Navbar() {
  return (
    <header className="navbar">
      <div className="navbar__inner container">
        <Link to="/" className="navbar__brand">
          <span className="navbar__brand-mark">ISL</span>
          <span className="navbar__brand-name">Investment Strategy Lab</span>
        </Link>
        <nav className="navbar__nav" aria-label="Módulos">
          {MODULES.map(m => (
            <NavLink
              key={m.key}
              to={m.path}
              title={m.status === 'soon' ? `${m.label} — Próximamente` : m.label}
              className={({ isActive }) =>
                [
                  'navbar__link',
                  m.status === 'soon' ? 'navbar__link--soon' : '',
                  isActive ? 'navbar__link--active' : '',
                ].join(' ')
              }
            >
              {m.label}
              {m.status === 'soon' && <span className="navbar__soon">Pronto</span>}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  )
}
