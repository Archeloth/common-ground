import { useRef, useState } from 'react'
import type { Saves } from './useSaves'
import type { SlotMeta } from '../persistence/slots'
import { SLOT_KEYS } from '../persistence/slots'
import SettingsScreen from './SettingsScreen'
import { formatGameDate } from './dates'
import { t } from './i18n'
import { ISSUES_URL, SOUNDS_LICENSE_URL, SOUNDS_URL, SOURCE_URL } from './links'
import './MainMenu.css'

interface MainMenuProps {
  saves: Saves
  notice: string | null
  onDismissNotice: () => void
  onContinue: () => void
  onNewGame: () => void
  onLoad: (key: string) => void
  onImport: (file: File) => void
  onHowToPlay: () => void
}

type View = 'main' | 'load' | 'settings' | 'credits'

function savedLine(meta: SlotMeta): string {
  const date = new Date(meta.savedAt)
  const time = Number.isNaN(date.getTime())
    ? '?'
    : date.toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  return t('menu.savedLine', { date: formatGameDate(meta.day), time })
}

// The main menu (Milestone 8.6): where players land, choose to continue their
// town or start a new one, load a slot, change settings or read how to play.
// The game screen's Menu button comes back here.
export default function MainMenu({
  saves,
  notice,
  onDismissNotice,
  onContinue,
  onNewGame,
  onLoad,
  onImport,
  onHowToPlay,
}: MainMenuProps) {
  const [view, setView] = useState<View>('main')
  const fileRef = useRef<HTMLInputElement>(null)
  const autosave = saves.meta.auto
  const manual = SLOT_KEYS.filter((key) => key !== 'auto')

  return (
    <div className="main-menu">
      <div className="menu-backdrop" aria-hidden="true">
        <span className="menu-blob b1" />
        <span className="menu-blob b2" />
        <span className="menu-blob b3" />
        <span className="menu-blob b4" />
        <span className="menu-blob b5" />
        <span className="menu-river" />
      </div>

      <main className="menu-card">
        <h1 className="menu-title">{t('app.title')}</h1>
        <p className="menu-tagline">{t('menu.tagline')}</p>

        {notice && (
          <p className="menu-notice" role="status">
            {notice}
            <button type="button" onClick={onDismissNotice} aria-label={t('reason.dismiss')}>
              ×
            </button>
          </p>
        )}

        {view === 'main' && (
          <nav className="menu-actions" aria-label={t('menu.title')}>
            {!saves.ready && (
              <p className="menu-loading" role="status">
                {t('menu.loadingSaves')}
              </p>
            )}
            {autosave && (
              <button type="button" className="menu-button primary" onClick={onContinue}>
                <span>{t('menu.continue')}</span>
                <small>{savedLine(autosave)}</small>
              </button>
            )}
            <button
              type="button"
              className={`menu-button${autosave ? '' : ' primary'}`}
              disabled={!saves.ready}
              onClick={() => {
                if (!autosave || window.confirm(t('menu.newGameConfirm'))) onNewGame()
              }}
            >
              <span>{t('menu.newGame')}</span>
              {!autosave && <small>{t('menu.newGameHint')}</small>}
            </button>
            <button type="button" className="menu-button" disabled={!saves.ready} onClick={() => setView('load')}>
              <span>{t('menu.load')}</span>
            </button>
            <button type="button" className="menu-button" onClick={() => setView('settings')}>
              <span>{t('menu.settings')}</span>
            </button>
            <button type="button" className="menu-button" onClick={onHowToPlay}>
              <span>{t('menu.howToPlay')}</span>
            </button>
          </nav>
        )}

        {view === 'load' && (
          <section className="menu-panel" aria-label={t('menu.load')}>
            <h2>{t('menu.load')}</h2>
            <ul className="menu-slots">
              {[...(autosave ? (['auto'] as const) : []), ...manual].map((key) => {
                const meta = saves.meta[key]
                const label = key === 'auto' ? t('saves.autosave') : t('saves.slot', { n: manual.indexOf(key) + 1 })
                return (
                  <li key={key}>
                    <button type="button" className="menu-slot" disabled={!meta} onClick={() => onLoad(key)}>
                      <strong>{label}</strong>
                      <small>{meta ? savedLine(meta) : t('saves.empty')}</small>
                    </button>
                  </li>
                )
              })}
            </ul>
            <div className="menu-row">
              <button type="button" className="menu-link" onClick={() => fileRef.current?.click()}>
                {t('saves.import')}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="application/json,.json"
                hidden
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (file) onImport(file)
                  event.target.value = ''
                }}
              />
              <button type="button" className="menu-link" onClick={() => setView('main')}>
                {t('menu.back')}
              </button>
            </div>
          </section>
        )}

        {view === 'settings' && <SettingsScreen onBack={() => setView('main')} />}

        {view === 'credits' && (
          <section className="menu-panel credits" aria-label={t('menu.credits')}>
            <h2>{t('menu.credits')}</h2>
            <p>{t('credits.game')}</p>
            <p>
              {t('credits.music')} Peaceful Village {t('credits.soundsBy', { author: t('credits.musicAuthor') })}, CC BY.
            </p>
            <p>
              {t('credits.sounds')}{' '}
              <a href={SOUNDS_URL} target="_blank" rel="noreferrer">
                Interface Sounds Starter Pack
              </a>{' '}
              {t('credits.soundsBy', { author: t('credits.soundsAuthor') })},{' '}
              <a href={SOUNDS_LICENSE_URL} target="_blank" rel="noreferrer">
                CC-BY-SA 3.0
              </a>
              . {t('credits.soundsChanges')}
            </p>
            <p>{t('credits.art')}</p>
            <p>
              <a href={SOURCE_URL} target="_blank" rel="noreferrer">
                {t('credits.source')}
              </a>
            </p>
            <div className="menu-row">
              <button type="button" className="menu-link" onClick={() => setView('main')}>
                {t('menu.back')}
              </button>
            </div>
          </section>
        )}

        <p className="menu-about">
          {t('menu.about')}{' '}
          <button type="button" className="menu-link inline" onClick={() => setView('credits')}>
            {t('menu.credits')}
          </button>{' '}
          ·{' '}
          <a href={ISSUES_URL} target="_blank" rel="noreferrer">
            {t('menu.feedback')}
          </a>
        </p>
      </main>
    </div>
  )
}
