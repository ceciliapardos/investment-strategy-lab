import { useState } from 'react'
import TypeBadge from '../../components/TypeBadge'
import { parseWeight, WEIGHT_MESSAGES } from './model'
import { formatPrice } from '../../utils/format'

const fmtWeight = w => (w == null ? '' : w.toLocaleString('es-ES', { maximumFractionDigits: 2, useGrouping: false }))

const NOT_DIRECT = {
  Index: 'Un índice no se puede comprar directamente: en la práctica se invierte a través de un fondo o ETF que lo replica.',
  Future: 'Un futuro es un derivado con garantías y vencimientos: no equivale a comprar el activo.',
}

/**
 * Fila de un activo con su peso objetivo.
 * El texto del campo se conserva tal cual lo escribe el usuario; el modelo
 * guarda el número (o null si está vacío o no es un número).
 */
export default function AssetRow({ asset, color, capital, onWeight, onRemove }) {
  const [draft, setDraft] = useState(fmtWeight(asset.weight))
  const parsed = parseWeight(draft)
  const issue = parsed.error            // 'empty' | 'text' | 'negative' | 'zero' | 'over100' | 'decimals' | null
  const pending = issue === 'empty'     // recién añadido: aviso suave, no error rojo
  const amount = !issue && capital ? (capital * parsed.value) / 100 : null

  function change(raw) {
    setDraft(raw)
    onWeight(parseWeight(raw).value)
  }

  return (
    <li className={`sb-asset ${issue && !pending ? 'sb-asset--invalid' : ''}`} data-testid="asset-row" data-ticker={asset.ticker}>
      <span className="sb-asset__swatch" style={{ background: color }} aria-hidden="true" />
      <div className="sb-asset__id">
        <div className="sb-asset__line">
          <span className="sb-asset__ticker">{asset.ticker}</span>
          <TypeBadge type={asset.assetType} size="sm" />
          {asset.currency && <span className="sb-asset__ccy">{asset.currency}</span>}
          {NOT_DIRECT[asset.assetType] && (
            <span className="sb-asset__flag" title={NOT_DIRECT[asset.assetType]}>No invertible directamente</span>
          )}
        </div>
        <span className="sb-asset__name">{asset.name}</span>
      </div>

      <div className="sb-asset__weight">
        <div className={`sb-weight ${pending ? 'is-pending' : issue ? 'is-invalid' : ''}`}>
          <input
            className="sb-weight__input num"
            inputMode="decimal"
            value={draft}
            placeholder="0"
            onChange={e => change(e.target.value)}
            onBlur={() => { if (!parsed.error) setDraft(fmtWeight(parsed.value)) }}
            aria-label={`Peso de ${asset.ticker} en %`}
            aria-invalid={Boolean(issue)}
            data-testid={`weight-${asset.ticker}`}
          />
          <span className="sb-weight__suffix">%</span>
        </div>
        {issue
          ? <span className={`${pending ? 'sb-field-pending' : 'sb-field-error'} sb-asset__msg`} role={pending ? undefined : 'alert'} data-testid={`weight-error-${asset.ticker}`}>{WEIGHT_MESSAGES[issue]}</span>
          : amount != null && <span className="sb-asset__amount num">≈ {formatPrice(amount, amount < 100 ? 2 : 0)} €</span>}
      </div>

      <button type="button" className="sb-icon-btn sb-asset__remove" onClick={onRemove}
              aria-label={`Eliminar ${asset.ticker} de la estrategia`} title="Eliminar activo" data-testid={`remove-${asset.ticker}`}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
        </svg>
      </button>
    </li>
  )
}
