import type { GameState, Reason } from '../game/types'
import type { TechDef } from '../game/technologies'
import { applyCommand } from '../game/state'
import { projectsFor, techTreeFor } from '../game/regionContent'
import { loadScenario } from '../game/scenario'
import { projectIcon } from './projectIcons'
import ReadMore from './ReadMore'
import { t } from './i18n'
import './ResearchMenu.css'


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
  const unlocksProjects = projectsFor(loadScenario())
    .filter((p) => p.requiresTech === tech.id)
    .map((p) => `${projectIcon(p.visual)} ${p.name}`)

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
      <ReadMore links={tech.readMore} />
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
            data-sound="none"
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

// Research drawer (Milestone 6): education cards for the research tree. The
// chapter goals moved to the GoalTracker in Milestone 8.6. The cards ask the real validation
// (applyCommand) for "can this be researched now?" so the UI cannot disagree
// with the rules.
export default function ResearchMenu({ state, onResearch }: ResearchMenuProps) {
  const technologies = techTreeFor(loadScenario())
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

    </div>
  )
}