import { useEffect } from 'react'
import type { GameState } from '../game/types'
import { loadScenario, neighborhoodById } from '../game/scenario'
import { WILDLIFE_KNOWLEDGE, speciesById } from '../game/wildlife'
import SpeciesThumb from './SpeciesThumb'
import { t } from './i18n'
import './Journal.css'

const scenario = loadScenario()
const SHOW_MS = 9000

interface WildlifeNoteProps {
  state: GameState
  onOpenJournal: () => void
  onDismiss: (species: string) => void
}

// "New in your journal": a small note at the top of the map when a species is
// spotted for the first time. It fades away by itself after a few seconds.
export default function WildlifeNote({ state, onOpenJournal, onDismiss }: WildlifeNoteProps) {
  const id = state.wildlifeNotices[0]
  useEffect(() => {
    if (!id) return
    const timer = window.setTimeout(() => onDismiss(id), SHOW_MS)
    return () => window.clearTimeout(timer)
  }, [id, onDismiss])
  const species = id ? speciesById(id) : undefined
  const sighting = id ? state.wildlife[id] : undefined
  if (!id || !species || !sighting) return null
  const place = neighborhoodById(scenario, sighting.neighborhood).name
  return (
    <div className="wildlife-note" role="status" key={id}>
      <SpeciesThumb id={id} found />
      <div className="wildlife-note-text">
        <span>{t('wildlife.found', { species: species.name, place })}</span>
        <span className="wildlife-note-reward">{t('wildlife.reward', { value: WILDLIFE_KNOWLEDGE })}</span>
      </div>
      <button
        type="button"
        className="wildlife-note-open"
        onClick={() => {
          onDismiss(id)
          onOpenJournal()
        }}
      >
        {t('wildlife.open')}
      </button>
      <button type="button" className="wildlife-note-close" data-sound="close" onClick={() => onDismiss(id)} aria-label={t('reason.dismiss')}>
        ×
      </button>
    </div>
  )
}
