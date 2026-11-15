import { useEffect, useRef } from 'react'
import { LEXICON_ENTRIES } from './lexiconEntries'
import type { LexiconEntryId } from './lexiconEntries'
import { t } from './i18n'
import './Lexicon.css'

interface LexiconProps {
  entry: LexiconEntryId
  onSelect: (entry: LexiconEntryId) => void
  onClose: () => void
  // Shown on the welcome page: closes the lexicon and starts the clock.
  onStart: () => void
}

// The in-game lexicon (Milestone 8.5 playtest feedback: "a separate panel to
// read about game mechanics first"). A modal with a contents list and one
// entry at a time. Esc or a click on the backdrop closes it; the game stays
// paused until the player chooses to start.
export default function Lexicon({ entry, onSelect, onClose, onStart }: LexiconProps) {
  const bodyRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return
      e.preventDefault() // topmost layer: nothing underneath reacts
      onClose()
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [onClose])

  // A new entry starts at its top.
  useEffect(() => {
    bodyRef.current?.scrollTo?.(0, 0)
  }, [entry])

  const paragraphs = t(`lexicon.${entry}.body`).split('\n\n')

  return (
    <div className="lexicon-backdrop" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="lexicon" role="dialog" aria-modal="true" aria-labelledby="lexicon-title">
        <header className="lexicon-header">
          <h2 id="lexicon-title">{t('lexicon.title')}</h2>
          <button type="button" className="lexicon-close" onClick={onClose} aria-label={t('lexicon.close')}>
            ×
          </button>
        </header>
        <div className="lexicon-columns">
          <nav className="lexicon-contents" aria-label={t('lexicon.contents')}>
            <ul>
              {LEXICON_ENTRIES.map((id) => (
                <li key={id}>
                  <button
                    type="button"
                    className={id === entry ? 'active' : ''}
                    aria-current={id === entry ? 'page' : undefined}
                    onClick={() => onSelect(id)}
                  >
                    {t(`lexicon.${id}.title`)}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
          <article className="lexicon-body" ref={bodyRef}>
            <h3>{t(`lexicon.${entry}.title`)}</h3>
            {paragraphs.map((text, index) => (
              <p key={index}>{text}</p>
            ))}
            {entry === 'welcome' && (
              <button type="button" className="lexicon-start" onClick={onStart}>
                {t('lexicon.start')}
              </button>
            )}
          </article>
        </div>
      </div>
    </div>
  )
}
