import { useState } from 'react'
import PageHero from '../../components/PageHero'
import Mascot from '../../components/Mascot'
import InfoTip from '../../components/InfoTip'
import ConfirmDialog from '../../components/ConfirmDialog'
import { useStrategies } from './StrategiesContext'
import { LIMITS, strategyStatus } from './model'
import { colorAt } from './palette'
import StrategyList from './StrategyList'
import StrategyHeader from './StrategyHeader'
import CapitalField from './CapitalField'
import AssetPicker from './AssetPicker'
import AssetRow from './AssetRow'
import AllocationMeter from './AllocationMeter'
import CompositionChart from './CompositionChart'
import StrategySummary from './StrategySummary'
import ContributionsPanel from './ContributionsPanel'
import './StrategyBuilder.css'

export default function StrategyBuilder() {
  const store = useStrategies()
  const { strategies, active } = store
  const [toDelete, setToDelete] = useState(null)

  const hero = (
    <PageHero
      eyebrow="Construye tu cartera"
      title="Strategy Builder"
      subtitle="Crea una o varias estrategias: elige activos, asigna su peso y define el capital inicial que quieres simular."
      compact
      aside={<Mascot pose="wave" message="Construye varias estrategias y después podrás comparar cómo se habrían comportado históricamente." />}
    />
  )

  if (strategies.length === 0) {
    return (
      <main className="sb">
        {hero}
        <div className="sb__body container">
          <StorageWarning warning={store.storageWarning} />
          <section className="sb-empty card" data-testid="empty-state">
            <h2 className="sb-empty__title">Crea tu primera estrategia</h2>
            <p className="sb-empty__text">
              Una estrategia es un reparto de tu capital entre varios activos. Por ejemplo:
              60 % en un ETF global y 40 % en un ETF de bonos. Aquí la diseñas; en la
              siguiente fase podrás ver cómo se habría comportado en el pasado.
            </p>
            <ol className="sb-empty__steps">
              <li><b>1</b><span>Ponle nombre y capital inicial</span></li>
              <li><b>2</b><span>Busca y añade activos</span></li>
              <li><b>3</b><span>Reparte los pesos hasta llegar al 100 %</span></li>
            </ol>
            <button type="button" className="btn-primary sb-empty__cta" onClick={store.create} data-testid="create-first">
              ＋ Crear estrategia
            </button>
            <p className="sb-empty__note">Se guardan solo en este navegador. No necesitas cuenta.</p>
          </section>
        </div>
      </main>
    )
  }

  const strategy = active || strategies[0]
  const status = strategyStatus(strategy)
  const id = strategy.id

  return (
    <main className="sb">
      {hero}
      <div className="sb__body container">
        <StorageWarning warning={store.storageWarning} />
        <div className="sb__layout">
          <StrategyList
            strategies={strategies}
            activeId={id}
            onSelect={store.select}
            onCreate={store.create}
          />

          <section className="sb-editor" aria-label={`Editor de ${strategy.name}`}>
            <div className="sb-editor__top card">
              <StrategyHeader
                strategy={strategy}
                status={status}
                canDuplicate={strategies.length < LIMITS.maxStrategies}
                onRename={name => store.rename(id, name)}
                onDuplicate={() => store.duplicate(id)}
                onDelete={() => setToDelete(strategy)}
              />
              <div className="sb-editor__settings">
                <CapitalField strategyId={id} value={strategy.initialCapital} onChange={v => store.setCapital(id, v)}
                              hasContributions={(strategy.recurringContributions || []).length > 0} />
                <StrategySummary strategy={strategy} status={status} />
              </div>
            </div>

            <div className="sb-editor__grid">
              <section className="sb-panel card" aria-labelledby="assets-title">
                <div className="sb-panel__head">
                  <h3 id="assets-title" className="sb-panel__title">
                    Activos y pesos
                    <InfoTip title="Peso">
                      Porcentaje del capital total de la estrategia asignado a este activo.
                      Entre todos deben sumar exactamente 100 %. Son pesos objetivo: cómo se
                      mantienen en el tiempo (rebalanceo) se decidirá al comparar estrategias.
                    </InfoTip>
                  </h3>
                  <span className="sb-panel__count num">{strategy.assets.length}/{LIMITS.maxAssets}</span>
                </div>

                <AssetPicker strategy={strategy} onAdd={asset => store.addAsset(id, asset)} />

                <AllocationMeter alloc={status.allocation} />

                {strategy.assets.length === 0 ? (
                  <div className="sb-assets-empty">
                    <p><b>Todavía no hay activos.</b></p>
                    <p>Busca un ticker o un nombre arriba y pulsa «Añadir». Después asigna a cada activo su porcentaje.</p>
                  </div>
                ) : (
                  <ul className="sb-assets" data-testid="asset-list">
                    {strategy.assets.map((a, i) => (
                      <AssetRow
                        key={`${id}:${a.ticker}`}
                        asset={a}
                        color={colorAt(i)}
                        capital={strategy.initialCapital}
                        onWeight={w => store.setWeight(id, a.ticker, w)}
                        onRemove={() => store.removeAsset(id, a.ticker)}
                      />
                    ))}
                  </ul>
                )}
              </section>

              <section className="sb-panel card sb-panel--composition" aria-labelledby="composition-title">
                <h3 id="composition-title" className="sb-panel__title">Composición</h3>
                <CompositionChart strategy={strategy} alloc={status.allocation} />
              </section>
            </div>

            <ContributionsPanel
              strategy={strategy}
              onAdd={c => store.addContribution(id, c)}
              onUpdate={(cid, patch) => store.updateContribution(id, cid, patch)}
              onRemove={cid => store.removeContribution(id, cid)}
            />

            <p className="sb-disclaimer">
              Las estrategias son simulaciones educativas guardadas en este navegador. No se invierte dinero real
              y no constituyen una recomendación de inversión.
            </p>
          </section>
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(toDelete)}
        title={`¿Eliminar «${toDelete?.name}»?`}
        confirmLabel="Eliminar estrategia"
        danger
        onCancel={() => setToDelete(null)}
        onConfirm={() => { store.remove(toDelete.id); setToDelete(null) }}
      >
        Se borrará de este navegador con sus {toDelete?.assets.length ?? 0} activos y no se puede deshacer.
      </ConfirmDialog>
    </main>
  )
}

function StorageWarning({ warning }) {
  if (!warning) return null
  const text = warning === 'corrupt'
    ? 'Las estrategias guardadas no se podían leer (datos dañados) y se ha empezado de cero. Se ha conservado una copia de seguridad en el navegador.'
    : 'Este navegador no permite guardar datos: las estrategias se perderán al cerrar la página.'
  return <p className="notice notice--warn" role="alert">{text}</p>
}
