import { useState } from 'react'
import type { Command, GameState, NeighborhoodDef } from '../game/types'
import { kindById, loadKinds } from '../game/kinds'
import { loadScenario, neighborhoodById } from '../game/scenario'
import { satisfactionOf } from '../game/satisfaction'
import { NEED_ORDER } from '../game/needs'
import { TOWN_MEETING_ENGAGEMENT, TOWN_MEETING_TIME } from '../game/constants'
import { applyCommand } from '../game/state'
import { messageForNeighborhood } from '../game/messages'
import type { MessageDef } from '../game/messages'
import ProjectSlots from './ProjectSlots'
import NeedBar from './NeedBar'
import { satisfactionTier } from './satisfactionTier'
import { t } from './i18n'
import './NeighborhoodPanel.css'

const kinds = loadKinds()
const scenario = loadScenario()


type PanelTab = 'overview' | 'projects' | 'community'
const TABS: readonly PanelTab[] = ['overview', 'projects', 'community']

interface NeighborhoodPanelProps {
  neighborhood: NeighborhoodDef
  state: GameState
  onStart: (command: Command) => void
  onRemove: (command: Command) => void
  onTownMeeting: (neighborhoodId: string) => void
  onStartBusLine: (from: string, to: string) => void
  onClose: () => void
}

function rewardText(def: MessageDef): string {
  if (def.reward.time !== undefined) return t('panel.rewardTime', { value: def.reward.time })
  if (def.reward.budget !== undefined) return t('panel.rewardBudget', { value: def.reward.budget })
  return t('panel.rewardKnowledge', { value: def.reward.knowledge ?? 0 })
}

// Side panel for a selected neighborhood (Milestone 2, tabs since 8.5):
// Overview (facts, need bars, what holds satisfaction back), Projects (slots
// and the picker) and Community (town meeting, resident request, bus links).
export default function NeighborhoodPanel({
  neighborhood,
  state,
  onStart,
  onRemove,
  onTownMeeting,
  onStartBusLine,
  onClose,
}: NeighborhoodPanelProps) {
  const kind = kindById(kinds, neighborhood.kind)
  // Needs, satisfaction and reasons are dynamic simulation values (Milestone 4);
  // the static scenario values are only a fallback for a stale or missing entry.
  const sim = state.neighborhoods[neighborhood.id]
  const needs = sim?.needs ?? neighborhood.needs
  const satisfaction = sim?.satisfaction ?? satisfactionOf(neighborhood.needs)
  const engagement = state.engagement[neighborhood.id] ?? neighborhood.engagement
  const neighbors = neighborhood.neighbors.map((id) => neighborhoodById(scenario, id))
  const bridgePartners = scenario.bridges
    .filter(({ from, to }) => from === neighborhood.id || to === neighborhood.id)
    .map(({ from, to }) => (from === neighborhood.id ? to : from))

  // Milestone 7: organizer controls — town meeting, resident request, bus links.
  const meeting = applyCommand(state, { type: 'townMeeting', neighborhood: neighborhood.id })
  const message = messageForNeighborhood(neighborhood.id)
  const messageDone = state.messages[neighborhood.id] === 'done'
  const linesHere = state.busLines.filter(([a, b]) => a === neighborhood.id || b === neighborhood.id)
  const linked = new Set(linesHere.flat())
  const candidates = neighbors.filter((n) => !linked.has(n.id))
  const [chosenBusTarget, setChosenBusTarget] = useState('')
  // Milestone 8.5: three tabs instead of one long scroll. The tab survives a
  // change of neighbourhood, so comparing projects between districts is quick.
  const [tab, setTab] = useState<PanelTab>('overview')
  const tier = satisfactionTier(satisfaction)
  const busTarget = chosenBusTarget && candidates.some((n) => n.id === chosenBusTarget)
    ? chosenBusTarget
    : (candidates[0]?.id ?? '')
  const busMeeting = busTarget
    ? applyCommand(state, { type: 'startBusLine', from: neighborhood.id, to: busTarget })
    : null

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

      <div className="panel-tabs" role="tablist" aria-label={t('panel.tabs')}>
        {TABS.map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className={`panel-tab${tab === id ? ' active' : ''}`}
            onClick={() => setTab(id)}
          >
            {t(`panel.tab.${id}`)}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div role="tabpanel">
        <dl className="panel-facts">
          <div className="fact">
            <dt>{t('panel.residents')}</dt>
            <dd>{neighborhood.residents.toLocaleString('en-GB')}</dd>
          </div>
          <div className="fact">
            <dt>{t('panel.engagement')}</dt>
            <dd>{Math.round(engagement)}/100</dd>
          </div>
          <div className="fact">
            <dt>{t('panel.slots')}</dt>
            <dd>{neighborhood.slots}</dd>
          </div>
          <div className="fact">
            <dt>{t('panel.satisfaction')}</dt>
            <dd>
              <span className={`tier-dot tier-${tier}`} aria-hidden="true" /> {Math.round(satisfaction)}/100{' '}
              <span className="panel-tier">{t(`tier.${tier}`)}</span>
            </dd>
          </div>
        </dl>

        <section className="panel-section">
          <h3>{t('panel.needs')}</h3>
          <div className="needs-grid">
            {NEED_ORDER.map((need) => (
              <NeedBar key={`${neighborhood.id}-${need}`} need={need} label={t(`need.${need}`)} value={needs[need]} />
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
        </div>
      )}

      {tab === 'projects' && (
        <div role="tabpanel">
        <ProjectSlots neighborhood={neighborhood} state={state} onStart={onStart} onRemove={onRemove} />
        </div>
      )}

      {tab === 'community' && (
        <div role="tabpanel">
        <div className="panel-actions">
          <button
            type="button"
            className="town-meeting"
              data-sound="none"
            disabled={!meeting.ok}
            onClick={() => onTownMeeting(neighborhood.id)}
          >
            {t('panel.townMeeting')}
          </button>
          <p className="panel-action-hint">
            {meeting.ok
              ? t('panel.townMeetingHint', { engagement: TOWN_MEETING_ENGAGEMENT, time: TOWN_MEETING_TIME })
              : t(`reason.${meeting.reason}`)}
          </p>
        </div>

        <section className="panel-section">
          <h3>{t('panel.message')}</h3>
          <p className="panel-message">{message.text}</p>
          <p className={`panel-message-reward${messageDone ? ' done' : ''}`}>
            {messageDone ? t('panel.messageDone') : rewardText(message)}
          </p>
        </section>

        <section className="panel-section">
          <h3>{t('panel.busLines')}</h3>
          {linesHere.length > 0 && (
            <ul className="panel-neighbors">
              {linesHere.map(([a, b]) => {
                const other = a === neighborhood.id ? b : a
                const n = neighborhoodById(scenario, other)
                return (
                  <li key={other}>
                    {n.name}
                    <span className="bridge-tag">🚌</span>
                  </li>
                )
              })}
            </ul>
          )}
          {candidates.length > 0 ? (
            <div className="bus-start">
              <select
                value={busTarget}
                onChange={(event) => setChosenBusTarget(event.target.value)}
                aria-label={t('panel.busLineStart')}
              >
                {candidates.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="save-action"
                disabled={!busMeeting?.ok}
                data-sound="none"
                onClick={() => onStartBusLine(neighborhood.id, busTarget)}
              >
                {t('panel.busLineStart')}
              </button>
              {busMeeting && !busMeeting.ok && (
                <p className="tech-blocked">{t(`reason.${busMeeting.reason}`)}</p>
              )}
            </div>
          ) : (
            <p className="panel-reasons-empty">{t('panel.busNone')}</p>
          )}
        </section>

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
        </div>
      )}
    </aside>
  )
}
