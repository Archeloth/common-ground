import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import TopBar from './TopBar'
import TownMap from './TownMap'
import type { FocusRequest } from './TownMap'
import NeighborhoodPanel from './NeighborhoodPanel'
import SaveMenu from './SaveMenu'
import ResearchMenu from './ResearchMenu'
import Toolbar from './Toolbar'
import type { DrawerId } from './Toolbar'
import TownPanel from './TownPanel'
import GoalTracker from './GoalTracker'
import TutorialCard from './TutorialCard'
import Celebration from './Celebration'
import GuideButton from './GuideButton'
import { expiryBubbles } from './expiryBubbles'
import type { ExpiryBubble } from './expiryBubbles'
import type { LexiconEntryId } from './lexiconEntries'
import type { Saves } from './useSaves'
import { useSettings } from './settings'
import { isTypingTarget, speedForKey } from './speedKeys'
import { t } from './i18n'
import { undoText } from './undoText'
import { UNDO_WINDOW_MS } from '../game/constants'
import { playSound } from './audio'
import type { SoundId } from './soundMap'
import { refreshAmbience, startAmbience, stopAmbience } from './ambience'
import { seasonOfDay } from '../game/calendar'
import { refreshMusic } from './music'
import type { GameStore } from '../game/store'
import type { Command, GameState, NeedId, Reason, Speed } from '../game/types'
import { applyCommand } from '../game/state'
import { getScenario, neighborhoodById } from '../game/scenario'
import { loadMilestones, milestoneById } from '../game/milestones'
import { TUTORIAL_STEPS, currentTutorialStep } from '../game/tutorial'
import JournalPanel from './JournalPanel'
import StoryCard from './StoryCard'
import WildlifeNote from './WildlifeNote'
import { allExpired } from '../game/expiry'
import { townNeedAverage } from '../game/milestones'

const TOUCH = typeof window !== 'undefined' && window.matchMedia('(hover: none)').matches

// The sound each successful command makes (refusals play 'refuse').
const COMMAND_SOUNDS: Partial<Record<Command['type'], SoundId>> = {
  startProject: 'build',
  removeProject: 'remove',
  renewProject: 'renew',
  renewAll: 'renew',
  startBusLine: 'renew',
  research: 'research',
  townMeeting: 'meeting',
}

// Slots whose project has finished building (construction time).
function countFinished(state: GameState): number {
  let total = 0
  for (const [id, slots] of Object.entries(state.projects)) {
    slots.forEach((p, slot) => {
      if (p !== null && (state.projectReady?.[id]?.[slot] ?? null) === null) total++
    })
  }
  return total
}

function countDone(state: GameState): number {
  return Object.values(state.messages).filter((status) => status === 'done').length
}

interface GameScreenProps {
  store: GameStore
  state: GameState
  saves: Saves
  notice: string | null
  setNotice: (text: string | null) => void
  lexiconOpen: boolean
  onLexicon: (entry: LexiconEntryId) => void
  onMenu: () => void
}

// The playing screen (split out of App in Milestone 8.6): map, top bar,
// toolbar drawers, goal tracker, neighbourhood panel, tutorial and banners.
export default function GameScreen({
  store,
  state,
  saves,
  notice,
  setNotice,
  lexiconOpen,
  onLexicon,
  onMenu,
}: GameScreenProps) {
  // One town per game screen; memoised so the hooks below can depend on it.
  const scenario = useMemo(() => getScenario(state.scenarioId), [state.scenarioId])
  const milestones = loadMilestones(scenario.id)
  const settings = useSettings()
  if (import.meta.env.DEV && new URLSearchParams(location.search).has('crash')) {
    throw new Error('Test crash (?crash in development)')
  }
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [reason, setReason] = useState<Reason | null>(null)
  const [drawer, setDrawer] = useState<DrawerId | null>(null)
  const onSelectionChange = useCallback((id: string | null) => setSelectedId(id), [])
  // "Show" buttons select a district and fly the camera to it (Milestone 9).
  const [focus, setFocus] = useState<FocusRequest | null>(null)
  const showDistrict = useCallback((id: string | null) => {
    setSelectedId(id)
    if (id) setFocus((previous) => ({ id, nonce: (previous?.nonce ?? 0) + 1 }))
  }, [])
  const selected = selectedId ? neighborhoodById(scenario, selectedId) : null
  // Tutorial pulse targets come from the current step (Milestone 8).
  const pulseIds = state.tutorialStep < TUTORIAL_STEPS.length ? TUTORIAL_STEPS[state.tutorialStep].pulse : []
  // Lapsed projects (map badges) and pending expiry popups (Milestone 8.5).
  const expiredIds = useMemo(
    () => [...new Set(allExpired(state, scenario).map((entry) => entry.neighborhood))],
    [state, scenario],
  )
  const bubbles = useMemo(() => expiryBubbles(state, scenario), [state, scenario])
  // Renew all (playtest): with two or more popups, one bar renews every lapsed
  // project the volunteers can cover, or hides the popups.
  const renewAll = useMemo(() => {
    if (bubbles.length < 2) return null
    const lapsed = allExpired(state, scenario).length
    const result = applyCommand(state, { type: 'renewAll' })
    if (!result.ok) return { lapsed, count: 0, cost: 0 }
    return { lapsed, count: lapsed - allExpired(result.state, scenario).length, cost: state.time - result.state.time }
  }, [bubbles, state, scenario])
  const [highlightNeed, setHighlightNeed] = useState<NeedId | null>(null)

  // Undo (Milestone 9 polish): a soft toast offers to take back the last action
  // for a few seconds; Z or Ctrl+Z does the same.
  const [undoOffer, setUndoOffer] = useState<{ text: string; id: number } | null>(null)

  const dispatch = useCallback(
    (command: Command) => {
      // Wording for a removal needs the project before it is gone.
      const removed =
        command.type === 'removeProject' ? store.getState().projects[command.neighborhood]?.[command.slot] : null
      const result = store.dispatch(command)
      setReason(result.ok ? null : result.reason)
      const sound = result.ok ? COMMAND_SOUNDS[command.type] : 'refuse'
      if (sound) playSound(sound)
      // Offer undo only for this very action (not e.g. a speed change made
      // while an earlier action is still undoable).
      if (result.ok && store.undoable() === command) setUndoOffer({ text: undoText(command, removed), id: Date.now() })
    },
    [store],
  )

  const undo = useCallback(() => {
    if (store.undo()) {
      playSound('close')
      setUndoOffer(null)
      setReason(null)
    }
  }, [store])

  useEffect(() => {
    if (!undoOffer) return
    const timer = window.setTimeout(() => setUndoOffer(null), UNDO_WINDOW_MS)
    return () => window.clearTimeout(timer)
  }, [undoOffer])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target) || event.altKey) return
      if (event.key.toLowerCase() !== 'z' || event.shiftKey) return
      if (!store.undoable()) return
      event.preventDefault()
      undo()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [store, undo])

  // Sounds for things the simulation did on its own: a chapter completed, a
  // resident request fulfilled, a project that ran its course.
  const previousRef = useRef(state)
  useEffect(() => {
    const before = previousRef.current
    previousRef.current = state
    if (before === state) return
    if (state.milestones.length > before.milestones.length) playSound('milestone')
    else if (countDone(state) > countDone(before)) playSound('reward')
    if (state.expiryNotices.length > before.expiryNotices.length) playSound('expire')
    if (countFinished(state) > countFinished(before)) playSound('complete')
    if (Object.keys(state.wildlife).length > Object.keys(before.wildlife).length) playSound('discovery')
    if (state.storyNotices.length > before.storyNotices.length) playSound('postcard')
  }, [state])

  // Generated ambience: on while playing; livelier as the town gets greener;
  // hushed while paused. Volume follows the settings.
  useEffect(() => {
    startAmbience()
    return () => stopAmbience()
  }, [])
  const green = Math.round(townNeedAverage(state, scenario, 'green') * 20) / 20
  const season = seasonOfDay(state.day)
  useEffect(() => {
    refreshAmbience({ green, paused: state.speed === 0, season })
    refreshMusic({ paused: state.speed === 0 })
  }, [green, state.speed, settings, season])

  // Clock shortcuts (Milestone 8.6): Space pauses/resumes at the last speed,
  // 1/2/3 pick 1x/2x/4x. Off while typing or while the lexicon is open.
  const lastRunningRef = useRef<Speed>(1)
  useEffect(() => {
    if (state.speed !== 0) lastRunningRef.current = state.speed
  }, [state.speed])
  useEffect(() => {
    if (lexiconOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey || isTypingTarget(event.target)) return
      const next = speedForKey(event.key, store.getState().speed, lastRunningRef.current)
      if (next === null) return
      event.preventDefault() // Space would otherwise scroll or press a focused button
      dispatch({ type: 'setSpeed', speed: next })
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [lexiconOpen, dispatch, store])

  // Setting "pause when panels open": opening the lexicon, a drawer or the
  // neighbourhood panel pauses; closing the last one resumes the old speed.
  // Changing the speed by hand while a panel is open cancels the resume.
  const overlayOpen = lexiconOpen || drawer !== null || selectedId !== null
  const resumeRef = useRef<Speed | null>(null)
  useEffect(() => {
    if (!settings.pauseOnPanels) {
      resumeRef.current = null
      return
    }
    const speed = store.getState().speed
    if (overlayOpen && speed !== 0 && resumeRef.current === null) {
      resumeRef.current = speed
      store.dispatch({ type: 'setSpeed', speed: 0 })
    } else if (!overlayOpen && resumeRef.current !== null) {
      const resume = resumeRef.current
      resumeRef.current = null
      if (store.getState().speed === 0) store.dispatch({ type: 'setSpeed', speed: resume })
    }
  }, [overlayOpen, settings.pauseOnPanels, store])
  useEffect(() => {
    // Read the live speed: `state.speed` can still be the pre-pause value in
    // the render where the panel opened, which would wrongly cancel the resume.
    if (overlayOpen && store.getState().speed !== 0) resumeRef.current = null
  }, [overlayOpen, state.speed, store])

  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(null), 4000)
    return () => window.clearTimeout(timer)
  }, [notice, setNotice])
  useEffect(() => {
    if (!reason) return
    const timer = window.setTimeout(() => setReason(null), 6000)
    return () => window.clearTimeout(timer)
  }, [reason])

  const handleLoad = useCallback(
    async (key: string) => {
      if (await saves.load(key)) {
        setSelectedId(null)
        setNotice(t('saves.loadOk'))
      }
    },
    [saves, setNotice],
  )
  const handleImport = useCallback(
    async (file: File) => {
      if (await saves.importFile(file)) {
        setSelectedId(null)
        setNotice(t('saves.loadOk'))
      }
    },
    [saves, setNotice],
  )
  const handleRenew = useCallback(
    (bubble: ExpiryBubble) => dispatch({ type: 'renewProject', neighborhood: bubble.neighborhoodId, slot: bubble.slot }),
    [dispatch],
  )
  const dismissWildlife = useCallback(
    (species: string) => dispatch({ type: 'dismissWildlifeNotice', species }),
    [dispatch],
  )
  const handleDismissExpiry = useCallback(
    (key: string) => dispatch({ type: 'dismissExpiryNotice', notice: key }),
    [dispatch],
  )

  return (
    <div className="app">
      <TopBar state={state} onSpeed={(speed) => dispatch({ type: 'setSpeed', speed })} onLexicon={onLexicon} />
      <div className="stage">
        <TownMap
          selectedId={selectedId}
          onSelectionChange={onSelectionChange}
          pulseIds={pulseIds}
          expiredIds={expiredIds}
          bubbles={bubbles}
          onRenew={handleRenew}
          onDismiss={handleDismissExpiry}
          state={state}
          reducedMotion={settings.reducedMotion}
          onShow={showDistrict}
          focus={focus}
          highlightNeed={drawer === 'town' ? highlightNeed : null}
        />
        <GoalTracker state={state} />
        <Toolbar
          open={drawer}
          onOpen={setDrawer}
          onLexicon={() => onLexicon('welcome')}
          onMenu={onMenu}
          drawers={{
            town: (
              <TownPanel
                state={state}
                onHighlightNeed={setHighlightNeed}
                onSelect={(id) => {
                  // On phones the drawer and the bottom sheet would overlap.
                  if (window.matchMedia('(max-width: 700px)').matches) setDrawer(null)
                  showDistrict(id)
                }}
              />
            ),
            research: <ResearchMenu state={state} onResearch={(tech) => dispatch({ type: 'research', tech })} />,
            journal: (
              <JournalPanel
                state={state}
                onShow={(id) => {
                  if (window.matchMedia('(max-width: 700px)').matches) setDrawer(null)
                  showDistrict(id)
                }}
              />
            ),
            saves: (
              <SaveMenu
                meta={saves.meta}
                onSave={(key) => void saves.save(key)}
                onLoad={(key) => void handleLoad(key)}
                onExport={saves.exportCurrent}
                onImport={(file) => void handleImport(file)}
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
            onTownMeeting={(id) => dispatch({ type: 'townMeeting', neighborhood: id })}
            onStartBusLine={(from, to) => dispatch({ type: 'startBusLine', from, to })}
            onClose={() => setSelectedId(null)}
          />
        )}
        <TutorialCard state={state} onNext={() => dispatch({ type: 'tutorialNext' })} />
        {/* Postcards share the bottom-left corner: they wait for the tutorial
            card and the renew-all bar to leave. */}
        {!currentTutorialStep(state) && !renewAll && (
          <StoryCard
            state={state}
            onShow={showDistrict}
            onClose={(key) => dispatch({ type: 'dismissStoryNotice', notice: key })}
          />
        )}
        <GuideButton state={state} onShow={showDistrict} />
        {renewAll && (
          <div className="renew-all" role="region" aria-label={t('renewAll.text', { count: renewAll.lapsed })}>
            <span>
              <span aria-hidden="true">{'âŚ›'} </span>
              {t('renewAll.text', { count: renewAll.lapsed })}
            </span>
            <button
              type="button"
              className="renew-all-button"
              data-sound="none"
              disabled={renewAll.count === 0}
              onClick={() => dispatch({ type: 'renewAll' })}
            >
              {renewAll.count === 0
                ? t('renewAll.none')
                : renewAll.count === renewAll.lapsed
                  ? t('renewAll.all', { cost: renewAll.cost })
                  : t('renewAll.some', { count: renewAll.count, total: renewAll.lapsed, cost: renewAll.cost })}
            </button>
            <button
              type="button"
              className="renew-all-hide"
              onClick={() => bubbles.forEach((bubble) => dispatch({ type: 'dismissExpiryNotice', notice: bubble.key }))}
            >
              {t('renewAll.dismiss')}
            </button>
          </div>
        )}
        {undoOffer && (
          <div className="undo-toast" role="status" key={undoOffer.id}>
            <span>{undoOffer.text}</span>
            <button type="button" className="undo-button" data-sound="none" onClick={undo}>
              {t('undo.button')}
            </button>
            <span className="undo-timer" aria-hidden="true" />
          </div>
        )}
        {!notice && !reason && (
          <WildlifeNote state={state} onOpenJournal={() => setDrawer('journal')} onDismiss={dismissWildlife} />
        )}
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
              Ă—
            </button>
          </div>
        )}
        {state.milestoneNotices.length > 0 && (
          <Celebration
            milestones={state.milestoneNotices.map((id) => milestoneById(milestones, id))}
            onDone={() => dispatch({ type: 'clearMilestoneNotices' })}
          />
        )}
      </div>
      <p className="app-help">{t(TOUCH ? 'app.helpTouch' : 'app.help')}</p>
    </div>
  )
}
