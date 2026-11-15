import type { Command, GameState, NeighborhoodDef, ProjectDef, Reason } from '../game/types'
import { loadProjects, projectById } from '../game/projects'
import { applyCommand, projectTimeCost } from '../game/state'
import { expiryOf, isExpired, isRenewable } from '../game/expiry'
import { t } from './i18n'
import { formatGameDate } from './dates'
import NeedIcon from './NeedIcon'
import { NEED_COLORS } from './render/colors'
import { projectIcon } from './projectIcons'
import './ProjectSlots.css'

const projects = loadProjects()

// What a project improves, as small chips coloured by need (Milestone 9).
function EffectChips({ project }: { project: ProjectDef }) {
  return (
    <span className="effect-chips">
      {project.effects.map((effect) => (
        <span key={effect.need} className="effect-chip" style={{ color: NEED_COLORS[effect.need] }}>
          <NeedIcon need={effect.need} size={12} />+{Math.round(effect.change * 100)}% {t(`need.${effect.need}`)}
        </span>
      ))}
      {project.engagement > 0 && (
        <span className="effect-chip neutral">
          🤝 +{project.engagement} {t('panel.engagement')}
        </span>
      )}
      {project.knowledgePerMonth > 0 && (
        <span className="effect-chip neutral">
          📚 {t('project.knowledgePerMonth', { value: project.knowledgePerMonth })}
        </span>
      )}
    </span>
  )
}

// "1 volunteer" / "2 volunteers" for a Volunteer cost.
function volunteersText(cost: number): string {
  return cost === 1 ? t('project.volunteer') : t('project.volunteers', { value: cost })
}

function renewLabel(cost: number): string {
  return cost === 1 ? t('project.renewOne') : t('project.renew', { cost })
}

// "lasts 3 years" for volunteer-run projects, "permanent" for infrastructure.
function lifetimeText(project: ProjectDef): string {
  const months = project.durationMonths
  if (months === undefined) return t('project.permanent')
  return months % 12 === 0 ? t('project.lasts', { years: months / 12 }) : t('project.lastsMonths', { months })
}

function pickerReason(project: ProjectDef, reason: Reason, engagement: number): string {
  if (reason === 'insufficient_budget') return t('project.needBudget', { value: project.cost })
  if (reason === 'insufficient_time') {
    return t('project.needTime', { value: projectTimeCost(project.time, engagement) })
  }
  return t(`reason.${reason}`)
}

interface ProjectSlotsProps {
  neighborhood: NeighborhoodDef
  state: GameState
  onStart: (command: Command) => void
  onRemove: (command: Command) => void
}

// Milestone 3: the project zone of the neighborhood panel. The picker disables a
// project by asking the real validation (applyCommand) for "can this start here
// and now?" — one source of truth for capacity, kind, budget and time.
export default function ProjectSlots({ neighborhood, state, onStart, onRemove }: ProjectSlotsProps) {
  const slots =
    state.projects[neighborhood.id] ?? Array.from({ length: neighborhood.slots }, () => null)
  const freeCount = slots.filter((slot) => slot === null).length
  // The picker lists what can be built here; projects that still need research
  // are summarised in one line, so the list stays short as the tree grows.
  const fitsHere = projects.filter((p) => p.allowedKinds.includes(neighborhood.kind))
  const offered = fitsHere.filter(
    (p) => (!p.requiresTech || state.research.includes(p.requiresTech)) && !slots.includes(p.id),
  )
  const locked = fitsHere.filter((p) => p.requiresTech && !state.research.includes(p.requiresTech))

  const engagement = state.engagement[neighborhood.id] ?? neighborhood.engagement
  const filled: Array<{ slot: number; projectId: string }> = []
  slots.forEach((projectId, index) => {
    if (projectId !== null) filled.push({ slot: index, projectId })
  })

  return (
    <section className="panel-section">
      <h3>{t('panel.projects')}</h3>

      {filled.length === 0 && <p className="project-empty">{t('panel.noProjects')}</p>}

      <ul className="slot-list">
        {filled.map(({ slot, projectId }) => {
          const expired = isExpired(state, neighborhood.id, slot)
          const ends = expiryOf(state, neighborhood.id, slot)
          const renewable = isRenewable(state, neighborhood.id, slot)
          const renew = renewable
            ? applyCommand(state, { type: 'renewProject', neighborhood: neighborhood.id, slot })
            : null
          const status =
            ends === null
              ? t('project.permanent')
              : expired
                ? t('project.expired')
                : t('project.endsOn', { date: formatGameDate(ends) })
          return (
            <li key={slot} className={`slot-row${expired ? ' expired' : renewable ? ' ending' : ''}`}>
              <span className="slot-info">
                <span className="slot-name">
                  <span aria-hidden="true">{projectIcon(projectById(projects, projectId).visual)} </span>
                  {projectById(projects, projectId).name}
                </span>
                <span className="slot-status">{status}</span>
              </span>
              <span className="slot-actions">
                {renew && (
                  <button
                    type="button"
                    className="slot-renew"
                    data-sound="none"
                    disabled={!renew.ok}
                    title={renew.ok ? undefined : t(`reason.${renew.reason}`)}
                    onClick={() => onStart({ type: 'renewProject', neighborhood: neighborhood.id, slot })}
                  >
                    {renewLabel(projectTimeCost(projectById(projects, projectId).time, engagement))}
                  </button>
                )}
                <button
                  type="button"
                  className="slot-remove"
                  data-sound="none"
                  onClick={() => onRemove({ type: 'removeProject', neighborhood: neighborhood.id, slot })}
                >
                  {t('project.remove')}
                </button>
              </span>
            </li>
          )
        })}
      </ul>

      {freeCount > 0 ? (
        <div className="project-picker">
          <p className="project-picker-title">{t('panel.freeSlots', { count: freeCount })}</p>
          {offered.map((project) => {
            const result = applyCommand(state, {
              type: 'startProject',
              neighborhood: neighborhood.id,
              project: project.id,
            })
            const ready = result.ok
            return (
              <div key={project.id} className={`project-option${ready ? '' : ' disabled'}`}>
                <span className="project-emoji" aria-hidden="true">
                  {projectIcon(project.visual)}
                </span>
                <div className="project-info">
                  <span className="project-name">{project.name}</span>
                  <span className="project-pills">
                    <span className="pill" title={t('resources.budget')}>
                      💰 {project.cost.toLocaleString('en-GB')}
                    </span>
                    <span className="pill" title={t('resources.time')}>
                      🙋 {volunteersText(projectTimeCost(project.time, engagement))}
                    </span>
                    <span className="pill" title={t('project.lifetime')}>
                      {project.durationMonths === undefined ? '🏗️' : '⏳'} {lifetimeText(project)}
                    </span>
                  </span>
                  <EffectChips project={project} />
                  <span className="project-explain">{project.explain}</span>
                  {!ready && (
                    <span className="project-disabled-reason">
                      {pickerReason(project, result.reason, engagement)}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  className="project-start"
                  data-sound="none"
                  disabled={!ready}
                  onClick={() =>
                    onStart({
                      type: 'startProject',
                      neighborhood: neighborhood.id,
                      project: project.id,
                    })
                  }
                >
                  {t('project.start')}
                </button>
              </div>
            )
          })}
          {locked.length > 0 && (
            <p className="project-locked">
              {t('project.lockedMore', { names: locked.map((p) => p.name).join(', ') })}
            </p>
          )}
        </div>
      ) : (
        <p className="project-full">{t('panel.allSlotsFull')}</p>
      )}
    </section>
  )
}
