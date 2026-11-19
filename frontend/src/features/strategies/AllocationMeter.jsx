import { fmtPct } from './model'

/** Barra y mensaje de asignación: "85 % asignado — queda 15 %". */
export default function AllocationMeter({ alloc }) {
  const { total, remaining, excess, status, invalidCount } = alloc
  const fill = Math.min(total, 100)
  const over = status === 'over'

  let text
  if (status === 'empty') text = 'Añade activos para empezar a repartir el capital.'
  else if (status === 'exact') text = <><b>100 % asignado</b> — la cartera está completa</>
  else if (status === 'under') text = <><b>{fmtPct(total)} asignado</b> — queda {fmtPct(remaining)}</>
  else text = <><b>{fmtPct(total)} asignado</b> — debes reducir {fmtPct(excess)}</>

  return (
    <div className={`sb-meter sb-meter--${status}`} data-testid="allocation" data-status={status}>
      <div className="sb-meter__text" role="status" aria-live="polite">
        <span className="sb-meter__icon" aria-hidden="true">
          {status === 'exact' ? '✓' : over ? '!' : '◔'}
        </span>
        <span data-testid="allocation-text">{text}</span>
      </div>
      <div className="sb-meter__track" aria-hidden="true">
        <span className="sb-meter__fill" style={{ width: `${over ? (100 / total) * 100 : fill}%` }} />
        {over && <span className="sb-meter__excess" style={{ width: `${(excess / total) * 100}%` }} />}
        <span className="sb-meter__mark" />
      </div>
      {invalidCount > 0 && (
        <p className="sb-meter__note">
          {invalidCount === 1 ? '1 activo tiene' : `${invalidCount} activos tienen`} un peso vacío o no válido.
        </p>
      )}
    </div>
  )
}
