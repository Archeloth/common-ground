import type { GameState } from '../game/types'
import { currentTutorialStep } from '../game/tutorial'
import { t } from './i18n'
import './TutorialCard.css'

interface TutorialCardProps {
  state: GameState
  onNext(): void
}

// The Milestone 8 scripted first fifteen minutes: a card at the bottom-left
// that walks through the tutorial steps. Action steps (garden, research,
// retrofit, watching the bars) complete by themselves in tick() once their
// condition is met; the intro step waits for the player's "Continue" button.
export default function TutorialCard({ state, onNext }: TutorialCardProps) {
  const step = currentTutorialStep(state)
  if (!step) return null
  const title = t('tutorial.title')
  const body = t(`tutorial.${step.id}`)
  const buttonLabel = step.id === 'intro' ? t('tutorial.continue') : t('tutorial.skip')
  return (
    <div className="tutorial-card" role="status">
      <div className="tutorial-card-body">
        <strong>{title}</strong>
        <p>{body}</p>
      </div>
      <button type="button" className="tutorial-card-button" onClick={onNext}>
        {buttonLabel}
      </button>
    </div>
  )
}