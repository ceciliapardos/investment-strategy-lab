import { Link } from 'react-router-dom'
import './Placeholder.css'

export default function ComingSoon({ module }) {
  return (
    <main className="placeholder">
      <div className="placeholder__inner container">
        <span className="placeholder__badge">Próximamente</span>
        <h1 className="placeholder__title">{module.label}</h1>
        <p className="placeholder__desc">{module.description}</p>
        <p className="placeholder__note">
          Este módulo todavía no está desarrollado. Se construirá en una fase posterior,
          después de validar las anteriores.
        </p>
        <Link to="/markets" className="btn-primary">Ir a Explore Markets</Link>
      </div>
    </main>
  )
}
