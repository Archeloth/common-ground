import type { Command, GameState, NeighborhoodDef } from '../game/types'
import { kindById, loadKinds } from '../game/kinds'
import { loadScenario, neighborhoodById } from '../game/scenario'
import { satisfactionOf } from '../game/satisfaction'
import ProjectSlots from './ProjectSlots'
import { t } from './i18n'
import './NeighborhoodPanel.css'

const kinds = loadKinds()
const scenario = loadScenario()

// Display order for the six need bars (the plan names them in this order).
const NEED_ORDER = ['energy', 'food', 'mobility', 'green', 'waste', 'housing'] as const

function NeedBar({ label, value }: { label: string; value: number }) {
  const percent = Math.round(value * 100)
  return (
    <div className="need-bar">
      <span className="need-label">{label}</span>
      <div className="need-track">
        <div className="need-fill" style={{ width: `${percent}%` }} />
      </div>
      <span className="need-value">{percent}%</span>
    </div>
  )
}

interface NeighborhoodPanelProps {
  neighborhood: NeighborhoodDef
  state: GameState
  onStart: (command: Command) => void
  onRemove: (command: Command) => void
  onClose: () => void
}

// Side panel for a selected neighborhood: kind, residents, slots, engagement,
// the six need bars and a placeholder satisfaction (Milestone 2 exit test:
// click any blob and read sensible, different values).
export default function NeighborhoodPanel({
  neighborhood,
  state,
  onStart,
  onRemove,
  onClose,
}: NeighborhoodPanelProps) {
  const kind = kindById(kinds, neighborhood.kind)
  // Needs, satisfaction and reasons are dynamic simulation values (Milestone 4);
  // the static scenario values are only a fallback for a stale or missing entry.
  const sim = state.neighborhoods[neighborhood.id]
  const needs = sim?.needs ?? neighborhood.needs
  const satisfaction = sim?.satisfaction ?? satisfactionOf(neighborhood.needs)
  const neighbors = neighborhood.neighbors.map((id) => neighborhoodById(scenario, id))
  const bridgePartners = scenario.bridges
    .filter(([from, to]) => from === neighborhood.id || to === neighborhood.id)
    .map(([from, to]) => (from === neighborhood.id ? to : from))

  return (
    <aside className="neighborhood-panel" aria-label={neighborhood.name}>
      <header className="panel-header">
        <div>
          <h2>{neighborhood.name}</h2>
          <span className="panel-kind">{kind.name}</span>
        </div>
        <button type="button" className="panel-close" onClick={onClose} aria-label={t('panel.close')}>
          ×
        </button>
      </header>

      <p className="panel-description">{kind.description}</p>

      <dl className="panel-facts">
        <div className="fact">
          <dt>{t('panel.residents')}</dt>
          <dd>{neighborhood.residents.toLocaleString('en-GB')}</dd>
        </div>
        <div className="fact">
          <dt>{t('panel.engagement')}</dt>
          <dd>{neighborhood.engagement}/100</dd>
        </div>
        <div className="fact">
          <dt>{t('panel.slots')}</dt>
          <dd>{neighborhood.slots}</dd>
        </div>
        <div className="fact">
          <dt>{t('panel.satisfaction')}</dt>
          <dd>{Math.round(satisfaction)}/100</dd>
        </div>
      </dl>

      <section className="panel-section">
        <h3>{t('panel.needs')}</h3>
        <div className="needs-grid">
          {NEED_ORDER.map((need) => (
            <NeedBar key={need} label={t(`need.${need}`)} value={needs[need]} />
          ))}
        </div>
      </section>

      <section className="panel-section">
        <h3>{t('panel.reasons')}</h3>
        {sim && sim.reasons.length > 0 ? (
          <ol className="panel-reasons">
            {sim.reasons.map((entry) => (
              <li key={entry.need}>
                {t('reason.gap', {
                  need: t(`need.${entry.need}`),
                  pct: Math.round(entry.coverage * 100),
                })}
              </li>
            ))}
          </ol>
        ) : (
          <p className="panel-reasons-empty">{t('panel.reasonsEmpty')}</p>
        )}
      </section>

      <ProjectSlots neighborhood={neighborhood} state={state} onStart={onStart} onRemove={onRemove} />

      {neighbors.length > 0 && (
        <section className="panel-section">
          <h3>{t('panel.nearby')}</h3>
          <ul className="panel-neighbors">
            {neighbors.map((n) => (
              <li key={n.id}>
                {n.name}
                {bridgePartners.includes(n.id) && <span className="bridge-tag">{t('panel.bridgeTo')}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </aside>
  )
}
