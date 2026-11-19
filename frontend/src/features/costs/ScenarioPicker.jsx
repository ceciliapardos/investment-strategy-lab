import { CUSTOM_FIELDS, CUSTOM_ID, NONE_ID, formatSourceDate, groupBrokers } from './model'

/**
 * «¿A través de qué intermediario quiero simular esta estrategia?»
 * Sin selección por defecto. Bancos tradicionales y brokers digitales en grupos
 * separados, cada uno en orden alfabético; ninguno se marca como mejor.
 */
export default function ScenarioPicker({ brokers, scenario, onChange }) {
  const groups = groupBrokers(brokers)
  const option = o => (
    <label key={o.id} className={`cost-scen__opt ${scenario === o.id ? 'is-checked' : ''}`} data-testid="cost-scenario">
      <input type="radio" name="cost-scenario" value={o.id} checked={scenario === o.id} onChange={() => onChange(o.id)} />
      <span className="cost-scen__radio" aria-hidden="true" />
      <span className="cost-scen__body">
        <span className="cost-scen__name">{o.entity || o.name}</span>
        {o.profile && <span className="cost-scen__profile">{o.profile}</span>}
        {o.meta && <span className="cost-scen__meta">{o.meta}</span>}
        {o.source?.consulted && <span className="cost-scen__date">Tarifas consultadas a {formatSourceDate(o.source.consulted)}</span>}
      </span>
    </label>
  )
  return (
    <div className="cost-scen-groups" role="radiogroup" aria-label="Intermediario">
      {groups.map(g => (
        <div key={g.key} className="cost-scen-group" data-testid={`cost-group-${g.key}`}>
          <span className="cmp-label">{g.label}</span>
          <div className="cost-scen">{g.items.map(option)}</div>
        </div>
      ))}
      <div className="cost-scen-group">
        <span className="cmp-label">Referencia y datos propios</span>
        <div className="cost-scen">
          {option({ id: NONE_ID, name: 'Sin costes de intermediación', meta: 'El resultado histórico tal cual' })}
          {option({ id: CUSTOM_ID, name: 'Costes personalizados', meta: 'Introduces tú las comisiones' })}
        </div>
      </div>
    </div>
  )
}

/** Formulario del escenario personalizado: datos introducidos por el usuario. */
export function CustomCostsForm({ form, errors, onChange }) {
  const groups = [...new Set(CUSTOM_FIELDS.map(f => f.group))]
  return (
    <div className="cost-custom" data-testid="cost-custom">
      <p className="cmp-muted">
        <b>Datos introducidos por ti.</b> Útil si tu banco te ofrece otras condiciones o las tarifas han cambiado.
        Deja vacío lo que no te cobren. Los porcentajes se escriben como 0,25 para un 0,25 %. La comisión de compra
        se aplica también a cada aportación periódica.
      </p>
      <div className="cost-custom__groups">
        {groups.map(g => (
          <fieldset key={g} className="cost-custom__group">
            <legend>{g}</legend>
            {CUSTOM_FIELDS.filter(f => f.group === g).map(f => (
              <label key={f.key} className="cost-field">
                <span className="cost-field__label">{f.label}</span>
                <span className={`cost-field__input ${errors[f.key] ? 'has-error' : ''}`}>
                  <input
                    inputMode="decimal"
                    value={form[f.key]}
                    placeholder="0"
                    onChange={e => onChange({ ...form, [f.key]: e.target.value })}
                    aria-invalid={Boolean(errors[f.key])}
                    data-testid={`custom-${f.key}`}
                  />
                  <span className="cost-field__unit">{f.unit}</span>
                </span>
                {errors[f.key] && <span className="cost-field__error" role="alert">{errors[f.key]}</span>}
              </label>
            ))}
          </fieldset>
        ))}
      </div>
    </div>
  )
}
