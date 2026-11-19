import { useMemo, useState } from 'react'
import type { GameState } from '../game/types'
import { nextAction } from '../game/guidance'
import { loadScenario, neighborhoodById } from '../game/scenario'
import { t } from './i18n'
import './GuideButton.css'


interface GuideButtonProps {
  state: GameState
  onShow(id: string | null): void
}

// The "what should I do next?" button (Milestone 8, plan item 2): the
// recommendation comes from a pure function over the open goals (tutorial step,
// milestones, resident requests, need gaps). The button can fly the player
// straight to the neighbourhood the hint is about.
export default function GuideButton({ state, onShow }: GuideButtonProps) {
  const scenario = loadScenario()
  const [open, setOpen] = useState(false)
  // Only work it out while the popover is open (Milestone 8.6 review).
  const action = useMemo(() => (open ? nextAction(state) : null), [open, state])
  const showTarget = action?.neighborhoodId ?? null

  const params = useMemo(function buildParams() {
    if (!action) return undefined
    const p = { ...action.params }
    if (action.needId) p.need = t(`need.${action.needId}`)
    return p
  }, [action])
  const text = action ? t(action.textKey, params) : t('guide.none')

  function followGuide() {
    if (showTarget) onShow(showTarget)
    setOpen(false)
  }

  function toggleGuide() {
    setOpen(!open)
  }

  return (
    <div className="guide-wrap">
      {open && (
        <div className="guide-popover" role="status">
          <span className="guide-label">{t('guide.title')}</span>
          <p className="guide-text">{text}</p>
          {showTarget && (
            <button type="button" className="guide-show" onClick={followGuide}>
              {t('guide.show', { name: neighborhoodById(scenario, showTarget).name })}
            </button>
          )}
        </div>
      )}
      <button type="button" className="guide-toggle" aria-expanded={open} onClick={toggleGuide}>
        {t('guide.title')}
      </button>
    </div>
  )
}