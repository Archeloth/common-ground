import { useState } from 'react'
import type { GameState } from '../game/types'
import { loadMilestones } from '../game/milestones'
import { taskMet, taskText } from './goalText'
import { t } from './i18n'
import './GoalTracker.css'

const milestones = loadMilestones()
const STORAGE_KEY = 'common-ground.goalTracker'

type TrackerMode = 'current' | 'all' | 'collapsed'

function readMode(): TrackerMode {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return value === 'all' || value === 'collapsed' ? value : 'current'
  } catch {
    return 'current'
  }
}

function writeMode(mode: TrackerMode): void {
  try {
    localStorage.setItem(STORAGE_KEY, mode)
  } catch {
    // Private mode or blocked storage: the tracker still works, just unremembered.
  }
}

// The always-visible goal tracker (Milestone 8.6 feedback: milestones get
// their own panel at the top left instead of hiding under research). It shows
// the current chapter's tasks with live progress; it can expand to all five
// chapters or collapse to a single line. The choice is a per-viewer
// convenience kept in localStorage.
export default function GoalTracker({ state }: { state: GameState }) {
  const [mode, setMode] = useState<TrackerMode>(readMode)
  const current = milestones.find((m) => !state.milestones.includes(m.id))
  const change = (next: TrackerMode) => {
    setMode(next)
    writeMode(next)
  }

  const heading = current
    ? t('goals.chapter', { chapter: current.chapter, name: current.name })
    : t('goals.allDone')

  return (
    <section className={`goal-tracker mode-${mode}`} aria-label={t('goals.title')}>
      <header className="goal-header">
        <button
          type="button"
          className="goal-heading"
          aria-expanded={mode !== 'collapsed'}
          onClick={() => change(mode === 'collapsed' ? 'current' : 'collapsed')}
        >
          <span className="goal-chevron" aria-hidden="true">
            {mode === 'collapsed' ? '▸' : '▾'}
          </span>
          <span className="goal-kicker">{t('goals.title')}</span>
          <span className="goal-name">{heading}</span>
        </button>
      </header>

      {mode !== 'collapsed' && (
        <>
          {mode === 'current' && current && (
            <ul className="goal-tasks">
              {current.conditions.map((condition, index) => {
                const met = taskMet(state, condition)
                return (
                  <li key={index} className={met ? 'met' : ''}>
                    <span className="goal-check" aria-hidden="true">
                      {met ? '✓' : '○'}
                    </span>
                    <span className="sr-only">{met ? t('town.taskDone') : t('town.taskOpen')}</span>
                    {taskText(state, condition)}
                  </li>
                )
              })}
            </ul>
          )}

          {mode === 'all' && (
            <ol className="goal-chapters">
              {milestones.map((def) => {
                const done = state.milestones.includes(def.id)
                const isCurrent = def.id === current?.id
                return (
                  <li key={def.id} className={done ? 'done' : isCurrent ? 'current' : ''}>
                    <span className="goal-check" aria-hidden="true">
                      {done ? '✓' : `${def.chapter}.`}
                    </span>
                    <span>
                      <strong>{def.name}</strong> - {def.goal}
                      {isCurrent && (
                        <ul className="goal-tasks nested">
                          {def.conditions.map((condition, index) => (
                            <li key={index} className={taskMet(state, condition) ? 'met' : ''}>
                              <span className="goal-check" aria-hidden="true">
                                {taskMet(state, condition) ? '✓' : '○'}
                              </span>
                              {taskText(state, condition)}
                            </li>
                          ))}
                        </ul>
                      )}
                    </span>
                  </li>
                )
              })}
            </ol>
          )}

          <button type="button" className="goal-more" onClick={() => change(mode === 'all' ? 'current' : 'all')}>
            {mode === 'all' ? t('goals.showCurrent') : t('goals.showAll')}
          </button>
        </>
      )}
    </section>
  )
}
