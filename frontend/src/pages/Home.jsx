import { Link, useNavigate } from 'react-router-dom'
import { MODULES } from '../modules'
import './Home.css'

export default function Home() {
  const navigate = useNavigate()

  return (
    <main className="home">
      {/* Hero */}
      <section className="home__hero container">
        <div className="home__hero-content">
          <div className="home__eyebrow">Laboratorio educativo de inversión</div>

          <h1 className="home__title">
            Investment<br />Strategy Lab
          </h1>

          <p className="home__question">
            ¿Qué estrategia de inversión es realmente más eficiente cuando
            tenemos en cuenta rentabilidad, riesgo, diversificación y todos
            sus costes?
          </p>

          <p className="home__desc">
            Explora activos, construye estrategias y analiza cómo se habrían
            comportado históricamente antes de invertir dinero real.
          </p>

          <button
            className="btn-primary home__cta"
            onClick={() => navigate('/markets')}
          >
            Explore Markets
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        <div className="home__hero-visual" aria-hidden="true">
          <div className="home__chart-mock">
            <svg viewBox="0 0 400 200" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="heroGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563EB" stopOpacity="0.15"/>
                  <stop offset="100%" stopColor="#2563EB" stopOpacity="0"/>
                </linearGradient>
              </defs>
              <path
                d="M0 160 C40 155 60 140 80 130 C100 120 110 125 130 110 C150 95 160 80 190 70 C220 60 240 75 260 55 C280 35 300 40 320 30 C340 20 360 25 400 10"
                stroke="#2563EB"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <path
                d="M0 160 C40 155 60 140 80 130 C100 120 110 125 130 110 C150 95 160 80 190 70 C220 60 240 75 260 55 C280 35 300 40 320 30 C340 20 360 25 400 10 L400 200 L0 200 Z"
                fill="url(#heroGrad)"
              />
              {[40, 80, 120, 160].map(y => (
                <line key={y} x1="0" y1={y} x2="400" y2={y} stroke="#E2E8F0" strokeWidth="1"/>
              ))}
            </svg>
          </div>
        </div>
      </section>

      {/* Módulos */}
      <section className="home__modules container" aria-labelledby="home-modules-title">
        <h2 id="home-modules-title" className="home__section-title">Módulos</h2>
        <div className="home__features">
          {MODULES.map(m => (
            <Link key={m.key} to={m.path} className="home__feature-card card">
              <span className="home__feature-top">
                <span className="home__feature-label">{m.label}</span>
                <span className={`home__status ${m.status === 'available' ? 'home__status--on' : ''}`}>
                  {m.status === 'available' ? 'Disponible' : 'Próximamente'}
                </span>
              </span>
              <span className="home__feature-desc">{m.description}</span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  )
}
