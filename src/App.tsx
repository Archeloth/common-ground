import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import TopBar from './ui/TopBar'
import TownMap from './ui/TownMap'
import NeighborhoodPanel from './ui/NeighborhoodPanel'
import SaveMenu from './ui/SaveMenu'
import ResearchMenu from './ui/ResearchMenu'
import Toolbar from './ui/Toolbar'
import type { DrawerId } from './ui/Toolbar'
import TownPanel from './ui/TownPanel'
import GoalTracker from './ui/GoalTracker'
import { loadScenario, neighborhoodById } from './game/scenario'
import { createGameStore } from './game/store'
import { initialState } from './game/state'
import { useGame } from './ui/useGame'
import { loadMilestones, milestoneById } from './game/milestones'
import type { Command, GameState, Reason, Speed } from './game/types'
import { isTypingTarget, speedForKey } from './ui/speedKeys'
import { openSaveDb } from './persistence/db'
import type { SaveDb } from './persistence/db'
import { createSave, parseAndLoad } from './persistence/saveFile'
import { loadSlot, readSlotMeta, saveSlot, SLOT_KEYS } from './persistence/slots'
import type { SlotMeta } from './persistence/slots'
import { downloadSaveFile, readSaveFile } from './persistence/fileTransfer'
import { t } from './ui/i18n'
import TutorialCard from './ui/TutorialCard'
import GuideButton from './ui/GuideButton'
import { TUTORIAL_STEPS } from './game/tutorial'
import { allExpired } from './game/expiry'
import { expiryBubbles } from './ui/expiryBubbles'
import type { ExpiryBubble } from './ui/expiryBubbles'
import Lexicon from './ui/Lexicon'
import type { LexiconEntryId } from './ui/lexiconEntries'
import './App.css'

const scenario = loadScenario()
const store = createGameStore()
const milestones = loadMilestones()

const AUTOSAVE_MS = 60_000 // plan: "autosave about once a minute"

// Milestone 8.5: the game always opens paused - after boot, a load or an
// import - so reading never costs the player progress.
function paused(state: GameState): GameState {
  return state.speed === 0 ? state : { ...state, speed: 0 }
}

// App owns the selected neighborhood; the simulation state lives in the store
// (src/game/store.ts). Saves are the plan's persistence story: IndexedDB slots
// (autosave + three manual) and .json export/import; a broken save shows a
// friendly message and never loses the town (Milestone 5).
function App() {
  const state = useGame(store)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [reason, setReason] = useState<Reason | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [lexicon, setLexicon] = useState<LexiconEntryId | null>(null)
  const [drawer, setDrawer] = useState<DrawerId | null>(null)
  const [meta, setMeta] = useState<Record<string, SlotMeta | null>>({
    auto: null,
    s1: null,
    s2: null,
    s3: null,
  })
  const dbRef = useRef<SaveDb | null>(null)
  const lastAutoJsonRef = useRef<string | null>(null)
  const onSelectionChange = useCallback((id: string | null) => setSelectedId(id), [])
  const selected = selectedId ? neighborhoodById(scenario, selectedId) : null
  // Tutorial pulse targets come from the current step (Milestone 8).
  const pulseIds =
    state.tutorialStep < TUTORIAL_STEPS.length ? TUTORIAL_STEPS[state.tutorialStep].pulse : []

  // Milestone 8.5: lapsed projects (map badges) and pending expiry popups.
  const expiredIds = useMemo(
    () => [...new Set(allExpired(state, scenario).map((entry) => entry.neighborhood))],
    [state],
  )
  const bubbles = useMemo(() => expiryBubbles(state, scenario), [state])

  const refreshMeta = useCallback(async () => {
    const database = dbRef.current
    if (!database) return
    const next: Record<string, SlotMeta | null> = { auto: null, s1: null, s2: null, s3: null }
    for (const key of SLOT_KEYS) next[key] = await readSlotMeta(database, key)
    setMeta(next)
  }, [])

  useEffect(() => {
    store.start()
    return () => store.stop()
  }, [])

  // Boot: open the save database, restore the last known good autosave (or keep
  // a fresh town if none exists), then list the slots for the menu.
  useEffect(() => {
    let cancelled = false
    void (async () => {
      const database = await openSaveDb()
      if (cancelled) {
        database.close()
        return
      }
      dbRef.current = database
      const autosave = await loadSlot(database, 'auto')
      if (autosave.save) {
        store.replaceState(paused(autosave.save.state))
      } else {
        // A fresh town: open the lexicon on its welcome page.
        setLexicon('welcome')
        if (autosave.problems.length > 0) setNotice(t('saves.loadFailed'))
      }
      await refreshMeta()
    })().catch(() => setNotice(t('saves.loadFailed')))
    return () => {
      cancelled = true
      dbRef.current?.close()
    }
  }, [refreshMeta])

  // Autosave roughly once a minute, plus a flush whenever the tab is hidden or
  // closed — that flush makes "close the tab, reopen it and continue exactly
  // where you were" hold even before the first minute elapses.
  useEffect(() => {
    const flush = () => {
      const database = dbRef.current
      if (!database) return
      const json = JSON.stringify(store.getState())
      if (json === lastAutoJsonRef.current) return
      lastAutoJsonRef.current = json
      void saveSlot(database, 'auto', createSave(store.getState())).catch(() => {
        lastAutoJsonRef.current = null // allow a retry next time
      })
    }
    const onVisibilityChange = () => {
      if (document.hidden) flush()
    }
    const interval = window.setInterval(flush, AUTOSAVE_MS)
    window.addEventListener('pagehide', flush)
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      window.clearInterval(interval)
      window.removeEventListener('pagehide', flush)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [])

  const dispatch = useCallback((command: Command) => {
    const result = store.dispatch(command)
    setReason(result.ok ? null : result.reason)
  }, [])

  const handleSave = useCallback(
    async (key: string) => {
      const database = dbRef.current
      if (!database) return
      await saveSlot(database, key, createSave(store.getState()))
      setNotice(t('saves.savedOk'))
      await refreshMeta()
    },
    [refreshMeta],
  )

  const handleLoad = useCallback(
    async (key: string) => {
      const database = dbRef.current
      if (!database) return
      const result = await loadSlot(database, key)
      if (result.save) {
        store.replaceState(paused(result.save.state))
        setNotice(t('saves.loadOk'))
      } else if (result.problems.length > 0) {
        setNotice(`${t('saves.loadFailed')} — ${result.problems[0]}`)
      }
      await refreshMeta()
    },
    [refreshMeta],
  )

  const handleExport = useCallback(() => {
    downloadSaveFile(createSave(store.getState()))
    setNotice(t('saves.exportOk'))
  }, [])

  const handleImport = useCallback(
    async (file: File) => {
      try {
        const text = await readSaveFile(file)
        const result = parseAndLoad(text)
        if (result.ok) {
          store.replaceState(paused(result.save.state))
          setNotice(t('saves.loadOk'))
        } else {
          setNotice(`${t('saves.loadFailed')} — ${result.problems[0] ?? ''}`)
        }
        await refreshMeta()
      } catch {
        setNotice(t('saves.loadFailed'))
      }
    },
    [refreshMeta],
  )

  const handleNewGame = useCallback(() => {
    store.replaceState(initialState(scenario))
    setNotice(t('saves.newGameOk'))
    setLexicon('welcome')
  }, [])

  const onResearch = useCallback((tech: string) => {
    dispatch({ type: 'research', tech })
  }, [dispatch])

  const onGotIt = useCallback(() => {
    dispatch({ type: 'clearMilestoneNotices' })
  }, [dispatch])

  const handleTownMeeting = useCallback((neighborhoodId: string) => {
    dispatch({ type: 'townMeeting', neighborhood: neighborhoodId })
  }, [dispatch])

  const handleRenew = useCallback((bubble: ExpiryBubble) => {
    dispatch({ type: 'renewProject', neighborhood: bubble.neighborhoodId, slot: bubble.slot })
  }, [dispatch])

  const handleDismissExpiry = useCallback((key: string) => {
    dispatch({ type: 'dismissExpiryNotice', notice: key })
  }, [dispatch])

  const closeLexicon = useCallback(() => setLexicon(null), [])

  // Clock shortcuts (Milestone 8.6): Space pauses/resumes at the last speed,
  // 1/2/3 pick 1x/2x/4x. Off while typing or while the lexicon is open.
  const lastRunningRef = useRef<Speed>(1)
  useEffect(() => {
    if (state.speed !== 0) lastRunningRef.current = state.speed
  }, [state.speed])
  useEffect(() => {
    if (lexicon) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey || isTypingTarget(event.target)) return
      const next = speedForKey(event.key, store.getState().speed, lastRunningRef.current)
      if (next === null) return
      event.preventDefault() // Space would otherwise scroll or press a focused button
      dispatch({ type: 'setSpeed', speed: next })
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [lexicon, dispatch])
  const openLexicon = useCallback(() => setLexicon('welcome'), [])
  const startPlaying = useCallback(() => {
    setLexicon(null)
    dispatch({ type: 'setSpeed', speed: 1 })
  }, [dispatch])

  const handleStartBusLine = useCallback((from: string, to: string) => {
    dispatch({ type: 'startBusLine', from, to })
  }, [dispatch])

  return (
    <div className="app">
      <TopBar
        state={state}
        onSpeed={(speed) => dispatch({ type: 'setSpeed', speed })}
        onLexicon={setLexicon}
      />
      <div className="stage">
        <TownMap
          selectedId={selectedId}
          onSelectionChange={onSelectionChange}
          busLines={state.busLines}
          pulseIds={pulseIds}
          expiredIds={expiredIds}
          bubbles={bubbles}
          onRenew={handleRenew}
          onDismiss={handleDismissExpiry}
          state={state}
        />
        <GoalTracker state={state} />
        <Toolbar
          open={drawer}
          onOpen={setDrawer}
          onLexicon={openLexicon}
          drawers={{
            town: (
              <TownPanel
                state={state}
                onSelect={(id) => {
                  setDrawer(null)
                  onSelectionChange(id)
                }}
              />
            ),
            research: <ResearchMenu state={state} onResearch={onResearch} />,
            saves: (
              <SaveMenu
                meta={meta}
                onSave={handleSave}
                onLoad={handleLoad}
                onExport={handleExport}
                onImport={handleImport}
                onNewGame={handleNewGame}
              />
            ),
          }}
        />
        {selected && (
          <NeighborhoodPanel
            neighborhood={selected}
            state={state}
            onStart={dispatch}
            onRemove={dispatch}
            onTownMeeting={handleTownMeeting}
            onStartBusLine={handleStartBusLine}
            onClose={() => setSelectedId(null)}
          />
        )}
        <TutorialCard state={state} onNext={() => dispatch({ type: 'tutorialNext' })} />
        <GuideButton state={state} onShow={onSelectionChange} />
        {(notice || reason) && (
          <div className={`reason-banner${notice ? ' info' : ''}`} role={notice ? 'status' : 'alert'}>
            <span>{notice ?? (reason ? t(`reason.${reason}`) : '')}</span>
            <button
              type="button"
              onClick={() => {
                setNotice(null)
                setReason(null)
              }}
              aria-label={t('reason.dismiss')}
            >
              ×
            </button>
          </div>
        )}
        {state.milestoneNotices.length > 0 && (
          <div className="milestone-banner" role="alert">
            <strong>{t('milestones.completedTitle')}</strong>
            <ul>
              {state.milestoneNotices.map((id) => (
                <li key={id}>
                  {t('milestones.completed', {
                    name: milestoneById(milestones, id).name,
                    goal: milestoneById(milestones, id).goal,
                  })}
                </li>
              ))}
            </ul>
            <button type="button" onClick={onGotIt}>
              {t('milestones.gotIt')}
            </button>
          </div>
        )}
      </div>
      <p className="app-help">{t('app.help')}</p>
      {lexicon && (
        <Lexicon entry={lexicon} onSelect={setLexicon} onClose={closeLexicon} onStart={startPlaying} />
      )}
    </div>
  )
}

export default App


