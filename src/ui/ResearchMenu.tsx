import type { GameState, Reason } from '../game/types'
import type { TechDef } from '../game/technologies'
import { applyCommand } from '../game/state'
import { loadTechnologies } from '../game/technologies'
import { loadMilestones } from '../game/milestones'
import { loadProjects } from '../game/projects'
import { t } from './i18n'
import './ResearchMenu.css'

const technologies = loadTechnologies()
const milestoneCatalog = loadMilestones()
const projectCatalog = loadProjects()

interface ResearchMenuProps {
  state: GameState
  onResearch: (tech: string) => void
}

function TechCard({
  tech,
  state,
  onResearch,
}: {
  tech: TechDef
  state: GameState
  onResearch: (tech: string) => void
}) {
  const researched = state.research.includes(tech.id)
  const result = applyCommand(state, { type: 'research', tech: tech.id })
  const failure: Reason | null = result.ok ? null : result.reason
  const statusClass = researched ? 'researched' : failure === null ? 'ready' : 'locked'
  const unlocksProjects = projectCatalog.filter((p) => p.requiresTech === tech.id).map((p) => p.name)

  return (
    <div className={`tech-card ${statusClass}`}>
      <div className="tech-head">
        <span className="tech-name">{tech.name}</span>
        <span className={`confidence confidence-${tech.confidence}`}>
          {t(`research.confidence.${tech.confidence}`)}
        </span>
      </div>
      <p className="tech-benefit">{tech.benefit}</p>
      <p className="tech-limit">{tech.limit}</p>
      {unlocksProjects.length > 0 && (
        <p className="tech-unlocks">{t('research.unlocksProjects', { names: unlocksProjects.join(', ') })}</p>
      )}
      <div className="tech-foot">
        <span className="tech-cost">{t('research.cost', { value: tech.cost })}</span>
        {researched ? (
          <span className="tech-done">{t('research.researched')}</span>
        ) : (
          <button
            type="button"
            className="tech-learn"
            disabled={failure !== null}
            onClick={() => onResearch(tech.id)}
          >
            {t('research.learn')}
          </button>
        )}
      </div>
      {!researched && failure !== null && <p className="tech-blocked">{t(`reason.${failure}`)}</p>}
    </div>
  )
}

// Research + milestones panel (Milestone 6): education cards for the research
// tree and the five chapter goals. The cards ask the real validation
// (applyCommand) for "can this be researched now?" so the UI cannot disagree
// with the rules.
export default function ResearchMenu({ state, onResearch }: ResearchMenuProps) {
  const branches = [...new Set(technologies.map((t) => t.branch))]

  return (
    <div className="research-panel">
      <section className="research-section">
        <h3>{t('research.panelTitle')}</h3>
        {branches.map((branch) => (
          <div key={branch} className="tech-branch">
            <h4>{t(`research.branch.${branch}`)}</h4>
            {technologies
              .filter((tech) => tech.branch === branch)
              .map((tech) => (
                <TechCard key={tech.id} tech={tech} state={state} onResearch={onResearch} />
              ))}
          </div>
        ))}
      </section>

      <section className="research-section">
        <h3>{t('research.goalsTitle')}</h3>
        <ul className="milestone-list">
          {milestoneCatalog.map((def) => {
            const done = state.milestones.includes(def.id)
            return (
              <li key={def.id} className={`milestone-row${done ? ' done' : ''}`}>
                <span className="milestone-check">{done ? '✓' : `${def.chapter}.`}</span>
                <span className="milestone-text">
                  <strong>{def.name}</strong>
                  {done ? ` (${t('milestones.done')})` : ` — ${def.goal}`}
                </span>
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}