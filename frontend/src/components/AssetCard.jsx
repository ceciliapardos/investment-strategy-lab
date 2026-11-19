import InfoTip from './InfoTip'
import TypeBadge from './TypeBadge'
import { formatPrice, formatTer } from '../utils/format'
import './AssetCard.css'

export default function AssetCard({ quote, ter }) {
  if (!quote) return null
  const terAvailable = ter?.status === 'available'

  return (
    <section className="asset-card card" aria-label={`Ficha de ${quote.ticker}`}>
      <div className="asset-card__head">
        <div className="asset-card__avatar" aria-hidden="true">{quote.ticker.replace('^', '').slice(0, 2)}</div>
        <div className="asset-card__id">
          <div className="asset-card__title-row">
            <h2 className="asset-card__ticker">{quote.ticker}</h2>
            <TypeBadge type={quote.type} />
          </div>
          <p className="asset-card__name">{quote.name}</p>
        </div>
        <div className="asset-card__price">
          <span className="asset-card__label">Último precio</span>
          <span className="asset-card__price-value num">
            {formatPrice(quote.price)}
            {quote.currency && <span className="asset-card__currency"> {quote.currency}</span>}
          </span>
        </div>
      </div>

      <dl className="asset-card__facts">
        <div className="asset-card__fact">
          <dt className="asset-card__label">
            TER / gastos corrientes
            <InfoTip title="TER (Total Expense Ratio)">
              Coste anual que cobra un fondo o ETF por su gestión. Se descuenta
              automáticamente del valor del fondo, por lo que ya está incluido en
              su precio. No se aplica a acciones, índices, criptomonedas ni futuros.
            </InfoTip>
          </dt>
          <dd className={`asset-card__fact-value num ${terAvailable ? '' : 'asset-card__fact-value--muted'}`}>
            {formatTer(ter)}
          </dd>
          {ter?.reason && <dd className="asset-card__hint">{ter.reason}</dd>}
        </div>
        {quote.exchange && (
          <div className="asset-card__fact">
            <dt className="asset-card__label">Mercado</dt>
            <dd className="asset-card__fact-value">{quote.exchange}</dd>
          </div>
        )}
        {quote.currency && (
          <div className="asset-card__fact">
            <dt className="asset-card__label">
              Divisa
              <InfoTip title="Divisa de cotización">
                Moneda en la que cotiza el activo. Las rentabilidades se calculan en
                esta divisa; si inviertes en euros, el tipo de cambio también afecta
                a tu resultado real.
              </InfoTip>
            </dt>
            <dd className="asset-card__fact-value">{quote.currency}</dd>
          </div>
        )}
      </dl>

      {quote.type_note && (
        <p className="notice notice--warn asset-card__note">
          <span aria-hidden="true">⚠</span>
          <span>{quote.type_note}</span>
        </p>
      )}
    </section>
  )
}
