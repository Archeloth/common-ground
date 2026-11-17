import { useState } from 'react'
import type { GameState } from '../game/types'
import { loadScenario, neighborhoodById } from '../game/scenario'
import { loadWildlife } from '../game/wildlife'
import { loadStories } from '../game/stories'
import ResidentAvatar from './ResidentAvatar'
import SpeciesThumb from './SpeciesThumb'
import ReadMore from './ReadMore'
import { formatGameDate } from './dates'
import { t } from './i18n'
import './Journal.css'

const scenario = loadScenario()

type Tab = 'wildlife' | 'people'

interface JournalPanelProps {
  state: GameState
  onShow: (neighborhood: string) => void
}

// The Journal drawer (post-Milestone 9): the species spotted so far, with a
// hint for those still to find, and every resident note received.
export default function JournalPanel({ state, onShow }: JournalPanelProps) {
  const [tab, setTab] = useState<Tab>('wildlife')
  return (
    <div className="journal">
      <h2 className="drawer-title">{t('toolbar.journal')}</h2>
      <div className="journal-tabs" role="tablist" aria-label={t('journal.tabs')}>
        {(['wildlife', 'people'] as const).map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className={`journal-tab${tab === id ? ' active' : ''}`}
            onClick={() => setTab(id)}
          >
            {t(`journal.${id}`)}
          </button>
        ))}
      </div>
      {tab === 'wildlife' ? <WildlifeTab state={state} onShow={onShow} /> : <PeopleTab state={state} onShow={onShow} />}
    </div>
  )
}

function WildlifeTab({ state, onShow }: JournalPanelProps) {
  const species = loadWildlife()
  const found = species.filter((s) => state.wildlife[s.id]).length
  return (
    <div role="tabpanel">
      <p className="journal-intro">{t('journal.wildlifeIntro')}</p>
      <p className="journal-count">{t('journal.wildlifeCount', { found, total: species.length })}</p>
      <ul className="journal-species">
        {species.map((s) => {
          const sighting = state.wildlife[s.id]
          return (
            <li key={s.id} className={`species-card${sighting ? ' found' : ''}`}>
              <SpeciesThumb id={s.id} found={!!sighting} />
              <div className="species-text">
                {sighting ? (
                  <>
                    <strong>{s.name}</strong>
                    <p className="species-note">{s.note}</p>
                    <ReadMore links={s.readMore} />
                    <button type="button" className="journal-link" onClick={() => onShow(sighting.neighborhood)}>
                      {t('journal.firstSeen', {
                        place: neighborhoodById(scenario, sighting.neighborhood).name,
                        date: formatGameDate(sighting.day),
                      })}
                    </button>
                  </>
                ) : (
                  <>
                    <strong className="species-unknown">{t('journal.notYet')}</strong>
                    <p className="species-note">{s.hint}</p>
                  </>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function PeopleTab({ state, onShow }: JournalPanelProps) {
  const residents = loadStories(scenario).filter((r) => (state.stories[r.id] ?? 0) > 0)
  return (
    <div role="tabpanel">
      <p className="journal-intro">{t('journal.peopleIntro')}</p>
      {residents.length === 0 && <p className="journal-empty">{t('journal.notMet')}</p>}
      <ul className="journal-people">
        {residents.map((r) => (
          <li key={r.id} className="person-card">
            <div className="person-head">
              <ResidentAvatar avatar={r.avatar} size={44} />
              <div>
                <strong>{r.name}</strong>
                <button type="button" className="journal-link" onClick={() => onShow(r.neighborhood)}>
                  {t('story.where', { role: r.role, place: neighborhoodById(scenario, r.neighborhood).name })}
                </button>
              </div>
            </div>
            {r.chapters.slice(0, state.stories[r.id] ?? 0).map((chapter, i) => (
              <p key={i} className="person-note">
                {chapter.text}
              </p>
            ))}
          </li>
        ))}
      </ul>
    </div>
  )
}
