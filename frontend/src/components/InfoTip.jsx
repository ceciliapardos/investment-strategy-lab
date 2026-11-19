import { useEffect, useId, useRef, useState } from 'react'
import './InfoTip.css'

/**
 * Pequeña explicación contextual: se abre al pasar el ratón, con el teclado
 * (foco) o tocando el icono en móvil. Se cierra con Escape o al tocar fuera.
 */
export default function InfoTip({ title, children, align = 'left' }) {
  const [open, setOpen] = useState(false)
  const id = useId()
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const onDoc = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    const onKey = e => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('pointerdown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <span
      className="infotip"
      ref={ref}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        className="infotip__btn"
        aria-label={`Qué es: ${title}`}
        aria-expanded={open}
        aria-describedby={open ? id : undefined}
        onClick={() => setOpen(o => !o)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
      >
        i
      </button>
      {open && (
        <span role="tooltip" id={id} className={`infotip__pop infotip__pop--${align}`}>
          <strong className="infotip__title">{title}</strong>
          <span className="infotip__body">{children}</span>
        </span>
      )}
    </span>
  )
}
