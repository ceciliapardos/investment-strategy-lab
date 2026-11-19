import { useState } from 'react'
import InfoTip from '../../components/InfoTip'
import { formatPrice } from '../../utils/format'
import {
  ADD_CONTRIBUTION_MESSAGES, CONTRIBUTION_MESSAGES, FREQUENCIES, LIMITS,
  contributionIssue, contributionsOf, parseAmount, yearlyContributions,
} from './model'

const fmt = v => (v == null ? '' : formatPrice(v, Number.isInteger(v) ? 0 : 2))

/**
 * Aportaciones periódicas (opcionales): cada una compra SOLO el activo elegido,
 * con la frecuencia indicada. No se redistribuye según los pesos.
 */
export default function ContributionsPanel({ strategy, onAdd, onUpdate, onRemove }) {
  const [addError, setAddError] = useState(null)
  const list = contributionsOf(strategy)
  const yearly = yearlyContributions(strategy)

  function add() {
    const err = onAdd({})
    setAddError(err ? (typeof ADD_CONTRIBUTION_MESSAGES[err] === 'function' ? ADD_CONTRIBUTION_MESSAGES[err]() : ADD_CONTRIBUTION_MESSAGES[err]) : null)
  }

  return (
    <section className="sb-panel card sb-contrib" aria-labelledby="contrib-title" data-testid="contrib-panel">
      <div className="sb-panel__head">
        <h3 id="contrib-title" className="sb-panel__title">
          Aportaciones periódicas <span className="sb-optional">opcional</span>
          <InfoTip title="Aportación periódica">
            Dinero nuevo que añadirías cada mes, trimestre o año para comprar un activo concreto de la
            estrategia. Es dinero que pones tú, no rentabilidad: la simulación lo distingue.
          </InfoTip>
        </h3>
        <span className="sb-panel__count num">{list.length}/{LIMITS.maxContributions}</span>
      </div>

      {list.length === 0 ? (
        <p className="sb-contrib__empty">
          Sin aportaciones: la estrategia es solo capital inicial y comprar y mantener. Si quieres simular que
          inviertes, por ejemplo, 300 € al mes en un ETF, añade una aportación.
        </p>
      ) : (
        <ul className="sb-contrib__list" data-testid="contrib-list">
          {list.map(c => (
            <ContributionRow
              key={c.id}
              c={c}
              strategy={strategy}
              onUpdate={patch => onUpdate(c.id, patch)}
              onRemove={() => onRemove(c.id)}
            />
          ))}
        </ul>
      )}

      <div className="sb-contrib__foot">
        <button type="button" className="btn-ghost" onClick={add} data-testid="contrib-add"
                disabled={list.length >= LIMITS.maxContributions}>
          ＋ Añadir aportación
        </button>
        {yearly > 0 && (
          <span className="sb-contrib__total num" data-testid="contrib-yearly">
            ≈ {formatPrice(yearly, 0)} € al año en aportaciones
          </span>
        )}
      </div>
      {addError && <p className="sb-field-error" role="alert" data-testid="contrib-add-error">{addError}</p>}
      {list.length > 0 && (
        <p className="sb-field-help">
          Cada aportación es una nueva compra del activo elegido: en Cost Analysis genera su propia comisión.
        </p>
      )}
    </section>
  )
}

function ContributionRow({ c, strategy, onUpdate, onRemove }) {
  const [draft, setDraft] = useState(fmt(c.amount))
  const [parseError, setParseError] = useState(null)
  const issue = parseError || contributionIssue(c, strategy)

  function changeAmount(raw) {
    setDraft(raw)
    const { value, error } = parseAmount(raw)
    setParseError(error)
    onUpdate({ amount: error ? null : value })
  }

  const orphan = issue === 'orphan'
  return (
    <li className={`sb-contrib__row ${issue ? 'is-invalid' : ''}`} data-testid="contrib-row">
      <label className="sb-contrib__field">
        <span className="sb-contrib__label">Activo</span>
        <select value={c.ticker} onChange={e => onUpdate({ ticker: e.target.value })} data-testid="contrib-asset">
          {orphan && <option value={c.ticker}>{c.ticker} (ya no está)</option>}
          {strategy.assets.map(a => <option key={a.ticker} value={a.ticker}>{a.ticker}</option>)}
        </select>
      </label>
      <label className="sb-contrib__field">
        <span className="sb-contrib__label">Importe</span>
        <span className={`sb-money sb-money--sm ${issue && !orphan && issue !== 'duplicate' ? 'is-invalid' : ''}`}>
          <input
            className="sb-money__input num"
            inputMode="decimal"
            value={draft}
            placeholder="300"
            onChange={e => changeAmount(e.target.value)}
            onBlur={() => { if (!parseError && c.amount != null) setDraft(fmt(c.amount)) }}
            aria-invalid={Boolean(issue)}
            data-testid="contrib-amount"
          />
          <span className="sb-money__suffix">€</span>
        </span>
      </label>
      <label className="sb-contrib__field">
        <span className="sb-contrib__label">Frecuencia</span>
        <select value={c.frequency} onChange={e => onUpdate({ frequency: e.target.value })} data-testid="contrib-frequency">
          {FREQUENCIES.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
        </select>
      </label>
      <button type="button" className="sb-icon-btn" onClick={onRemove} aria-label={`Eliminar aportación a ${c.ticker}`}
              data-testid="contrib-remove">✕</button>
      {issue && <p className="sb-field-error sb-contrib__error" data-testid="contrib-error">{CONTRIBUTION_MESSAGES[issue]}</p>}
    </li>
  )
}
