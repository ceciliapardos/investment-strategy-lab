import { useEffect, useRef } from 'react'
import './ConfirmDialog.css'

/** Diálogo de confirmación accesible (Escape o clic fuera = cancelar). */
export default function ConfirmDialog({ open, title, children, confirmLabel = 'Confirmar', danger, onConfirm, onCancel }) {
  const cancelRef = useRef(null)

  useEffect(() => {
    if (!open) return
    cancelRef.current?.focus()
    const onKey = e => { if (e.key === 'Escape') onCancel() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onCancel])

  if (!open) return null
  return (
    <div className="dialog__backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onCancel() }}>
      <div className="dialog" role="alertdialog" aria-modal="true" aria-labelledby="dialog-title">
        <h2 id="dialog-title" className="dialog__title">{title}</h2>
        <div className="dialog__body">{children}</div>
        <div className="dialog__actions">
          <button ref={cancelRef} type="button" className="btn-ghost" onClick={onCancel}>Cancelar</button>
          <button type="button" className={danger ? 'btn-danger' : 'btn-primary'} onClick={onConfirm} data-testid="confirm-dialog-ok">
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
