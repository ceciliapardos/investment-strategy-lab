import './PageHero.css'

/** Cabecera oscura de cada módulo: título, subtítulo, contenido (p. ej. buscador) y mascota. */
export default function PageHero({ eyebrow, title, subtitle, children, aside, compact = false }) {
  return (
    <section className={`hero ${compact ? 'hero--compact' : ''}`}>
      <div className="hero__inner container">
        <div className="hero__main">
          {eyebrow && <span className="hero__eyebrow">{eyebrow}</span>}
          <h1 className="hero__title">{title}</h1>
          {subtitle && <p className="hero__subtitle">{subtitle}</p>}
          {children && <div className="hero__content">{children}</div>}
        </div>
        {aside && <div className="hero__aside">{aside}</div>}
      </div>
    </section>
  )
}
