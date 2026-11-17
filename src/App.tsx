import { useCallback, useEffect, useState } from 'react'
import MainMenu from './ui/MainMenu'
import GameScreen from './ui/GameScreen'
import Lexicon from './ui/Lexicon'
import type { LexiconEntryId } from './ui/lexiconEntries'
import { useSaves } from './ui/useSaves'
import { applySettingsToDocument, getSettings, useSettings } from './ui/settings'
import { useGame } from './ui/useGame'
import { store } from './gameStore'
import { initialState } from './game/state'
import { loadScenario } from './game/scenario'
import { t } from './ui/i18n'
import { installUiSounds } from './ui/uiSounds'
import { refreshMusic } from './ui/music'
import { applyUpdate, useUpdateReady } from './ui/offline'
import './App.css'
import './ui/mobile.css'

const scenario = loadScenario()
applySettingsToDocument(getSettings())

type Screen = 'menu' | 'game'

// App switches between the main menu and the game (Milestone 8.6). The
// simulation lives in the store (src/game/store.ts); saves in useSaves
// (IndexedDB slots and .json files); preferences in settings.ts.
function App() {
  const state = useGame(store)
  const [screen, setScreen] = useState<Screen>('menu')
  const [notice, setNotice] = useState<string | null>(null)
  const [lexicon, setLexicon] = useState<LexiconEntryId | null>(null)
  const saves = useSaves(store, setNotice)
  const settings = useSettings()
  const updateReady = useUpdateReady()

  // The music follows the volume settings live (and is never hushed in the menu).
  useEffect(() => {
    refreshMusic(screen === 'menu' ? { paused: false } : undefined)
  }, [settings, screen])

  useEffect(() => {
    store.start()
    return () => store.stop()
  }, [])

  // Button clicks and the audio unlock on the first gesture (Milestone 9).
  useEffect(() => installUiSounds(), [])

  const enterGame = useCallback(() => {
    saves.setSessionActive(true)
    setScreen('game')
  }, [saves])

  const continueGame = useCallback(async () => {
    if (await saves.load('auto')) enterGame()
  }, [saves, enterGame])

  const newGame = useCallback(() => {
    store.replaceState(initialState(scenario))
    setNotice(null)
    enterGame()
    setLexicon('welcome') // a fresh town opens the lexicon's welcome page
  }, [enterGame])

  const loadSlot = useCallback(
    async (key: string) => {
      if (await saves.load(key)) {
        setNotice(t('saves.loadOk'))
        enterGame()
      }
    },
    [saves, enterGame],
  )

  const importSave = useCallback(
    async (file: File) => {
      if (await saves.importFile(file)) {
        setNotice(t('saves.loadOk'))
        enterGame()
      }
    },
    [saves, enterGame],
  )

  // Back to the main menu: save first, then pause. Autosave stops while in the
  // menu, so it can never overwrite the real save with another town.
  const toMenu = useCallback(() => {
    store.dispatch({ type: 'setSpeed', speed: 0 })
    saves.flushAutosave()
    saves.setSessionActive(false)
    setLexicon(null)
    setNotice(null)
    setScreen('menu')
  }, [saves])

  const startPlaying = useCallback(() => {
    setLexicon(null)
    store.dispatch({ type: 'setSpeed', speed: 1 })
  }, [])
  const closeLexicon = useCallback(() => setLexicon(null), [])

  return (
    <>
      {screen === 'menu' ? (
        <MainMenu
          saves={saves}
          notice={notice}
          onDismissNotice={() => setNotice(null)}
          onContinue={() => void continueGame()}
          onNewGame={newGame}
          onLoad={(key) => void loadSlot(key)}
          onImport={(file) => void importSave(file)}
          onHowToPlay={() => setLexicon('welcome')}
        />
      ) : (
        <GameScreen
          store={store}
          state={state}
          saves={saves}
          notice={notice}
          setNotice={setNotice}
          lexiconOpen={lexicon !== null}
          onLexicon={setLexicon}
          onMenu={toMenu}
        />
      )}
      {screen === 'menu' && updateReady && (
        <div className="update-banner" role="status">
          <span>{t('offline.updateReady')}</span>
          <button type="button" onClick={applyUpdate}>
            {t('offline.reload')}
          </button>
        </div>
      )}
      {lexicon && (
        <Lexicon
          entry={lexicon}
          onSelect={setLexicon}
          onClose={closeLexicon}
          onStart={screen === 'game' ? startPlaying : undefined}
        />
      )}
    </>
  )
}

export default App
