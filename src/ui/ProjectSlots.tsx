import type { Command, GameState, NeighborhoodDef, ProjectDef, Reason } from '../game/types'
import { loadProjects, projectById } from '../game/projects'
import { applyCommand } from '../game/state'
import { t } from './i18n'
import './ProjectSlots.css'

const projects = loadProjects()

function effectPreview(project: ProjectDef): string {
  const parts = project.effects.map(
    (effect) => `+${Math.round(effect.change * 100)}% ${t(`need.${effect.need}`)}`,
  )
  if (project.engagement > 0) parts.push(`+${project.engagement} ${t('panel.engagement')}`)
  return parts.join(' · ')
}

function pickerReason(project: ProjectDef, reason: Reason): string {
  if (reason === 'insufficient_budget') return t('project.needBudget', { value: project.cost })
  if (reason === 'insufficient_time') return t('project.needTime', { value: project.time })
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

  const filled: Array<{ slot: number; projectId: string }> = []
  slots.forEach((projectId, index) => {
    if (projectId !== null) filled.push({ slot: index, projectId })
  })

  return (
    <section className="panel-section">
      <h3>{t('panel.projects')}</h3>

      {filled.length === 0 && <p className="project-empty">{t('panel.noProjects')}</p>}

      <ul className="slot-list">
        {filled.map(({ slot, projectId }) => (
          <li key={slot} className="slot-row">
            <span className="slot-name">{projectById(projects, projectId).name}</span>
            <button
              type="button"
              className="slot-remove"
              onClick={() => onRemove({ type: 'removeProject', neighborhood: neighborhood.id, slot })}
            >
              {t('project.remove')}
            </button>
          </li>
        ))}
      </ul>

      {freeCount > 0 ? (
        <div className="project-picker">
          <p className="project-picker-title">{t('panel.freeSlots', { count: freeCount })}</p>
          {projects.map((project) => {
            const result = applyCommand(state, {
              type: 'startProject',
              neighborhood: neighborhood.id,
              project: project.id,
            })
            const ready = result.ok
            return (
              <div key={project.id} className={`project-option${ready ? '' : ' disabled'}`}>
                <div className="project-info">
                  <span className="project-name">{project.name}</span>
                  <span className="project-meta">
                    {t('project.cost', { value: project.cost })} ·{' '}
                    {t('project.months', { value: project.time })}
                  </span>
                  <span className="project-effects">{effectPreview(project)}</span>
                  <span className="project-explain">{project.explain}</span>
                  {!ready && (
                    <span className="project-disabled-reason">
                      {pickerReason(project, result.reason)}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  className="project-start"
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
        </div>
      ) : (
        <p className="project-full">{t('panel.allSlotsFull')}</p>
      )}
    </section>
  )
}
