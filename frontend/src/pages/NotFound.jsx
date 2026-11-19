import { Link } from 'react-router-dom'
import './Placeholder.css'

export default function NotFound() {
  return (
    <main className="placeholder">
      <div className="placeholder__inner container">
        <span className="placeholder__badge">Error 404</span>
        <h1 className="placeholder__title">Página no encontrada</h1>
        <p className="placeholder__desc">La dirección que has abierto no existe en la aplicación.</p>
        <Link to="/" className="btn-primary">Volver al inicio</Link>
      </div>
    </main>
  )
}
