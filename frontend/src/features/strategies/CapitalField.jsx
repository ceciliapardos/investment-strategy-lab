import { useEffect, useState } from 'react'
import InfoTip from '../../components/InfoTip'
import { CAPITAL_MESSAGES, parseCapital } from './model'
import { formatPrice } from '../../utils/format'

const fmt = v => (v == null ? '' : formatPrice(v, Number.isInteger(v) ? 0 : 2))

/**
 * Capital inicial simulado (en euros).
 * 0 € se admite y se guarda: es válido solo si la estrategia tiene aportaciones periódicas.
 */
export default function CapitalField({ strategyId, value, onChange, hasContributions = false }) {
  const [draft, setDraft] = useState(fmt(value))
  const [error, setError] = useState(value == null ? 'empty' : null)

  // Al cambiar de estrategia se carga su valor.
  useEffect(() => {
    setDraft(fmt(value))
    setError(value == null ? 'empty' : null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [strategyId])

  function handleChange(raw) {
    setDraft(raw)
    const { value: v, error: err } = parseCapital(raw)
    setError(err)
    onChange(err && err !== 'zero' ? null : v)
  }

  const isZero = error === 'zero' || value === 0
  const shownError = error && error !== 'zero' ? error : isZero && !hasContributions ? 'zeroNoContrib' : null
  const message = shownError === 'zeroNoContrib'
    ? 'Con 0 € de capital inicial necesitas al menos una aportación periódica.'
    : shownError
      ? CAPITAL_MESSAGES[shownError]
      : isZero
        ? 'Sin capital inicial: la estrategia empieza con la primera aportación periódica.'
        : 'Entre 0 € (solo con aportaciones) y 1.000 millones de euros.'

  return (
    <div className="sb-capital">
      <label className="sb-label" htmlFor="capital-input">
        Capital inicial simulado
        <InfoTip title="Capital inicial">
          Cantidad de dinero que quieres usar como punto de partida para la futura
          simulación. No es dinero real ni se invierte en ningún sitio.
        </InfoTip>
      </label>
      <div className={`sb-money ${shownError ? 'is-invalid' : ''}`}>
        <input
          id="capital-input"
          className="sb-money__input num"
          inputMode="decimal"
          value={draft}
          onChange={e => handleChange(e.target.value)}
          onBlur={() => { if (!error || error === 'zero') setDraft(fmt(parseCapital(draft).value)) }}
          aria-invalid={Boolean(shownError)}
          aria-describedby="capital-help"
          placeholder="10.000"
          data-testid="capital-input"
        />
        <span className="sb-money__suffix">€</span>
      </div>
      <p id="capital-help" className={shownError ? 'sb-field-error' : 'sb-field-help'} data-testid="capital-message">
        {message}
      </p>
    </div>
  )
}
