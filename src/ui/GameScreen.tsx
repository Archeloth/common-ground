import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import TopBar from './TopBar'
import TownMap from './TownMap'
import NeighborhoodPanel from './NeighborhoodPanel'
import SaveMenu from './SaveMenu'
import ResearchMenu from './ResearchMenu'
import Toolbar from './Toolbar'
import type { DrawerId } from './Toolbar'
import TownPanel from './TownPanel'
import GoalTracker from './GoalTracker'
import TutorialCard from './TutorialCard'
import GuideButton from './GuideButton'
import { expiryBubbles } from './expiryBubbles'
import type { ExpiryBubble } from './expiryBubbles'
import type { LexiconEntryId } from './lexiconEntries'
import type { Saves } from './useSaves'
import { useSettings } from './settings'
import { isTypingTarget, speedForKey } from './speedKeys'
import { t } from './i18n'
import { playSound } from './audio'
import type { SoundId } from './soundMap'
import { refreshAmbience, startAmbience, stopAmbience } from './ambience'
import type { GameStore } from '../game/store'
import type { Command, GameState, Reason, Speed } from '../game/types'
import { loadScenario, neighborhoodById } from '../game/scenario'
import { loadMilestones, milestoneById } from '../game/milestones'
import { TUTORIAL_STEPS } from '../game/tutorial'
import { allExpired } from '../game/expiry'
import { townNeedAverage } from '../game/milestones'

const scenario = loadScenario()
const milestones = loadMilestones()

// The sound each successful command makes (refusals play 'refuse').
const COMMAND_SOUNDS: Partial<Record<Command['type'], SoundId>> = {
  startProject: 'build',
  removeProject: 'remove',
  renewProject: 'renew',
  startBusLine: 'renew',
  research: 'research',
  townMeeting: 'reward',
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
  const settings = useSettings()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [reason, setReason] = useState<Reason | null>(null)
  const [drawer, setDrawer] = useState<DrawerId | null>(null)
  const onSelectionChange = useCallback((id: string | null) => setSelectedId(id), [])
  const selected = selectedId ? neighborhoodById(scenario, selectedId) : null
  // Tutorial pulse targets come from the current step (Milestone 8).
  const pulseIds = state.tutorialStep < TUTORIAL_STEPS.length ? TUTORIAL_STEPS[state.tutorialStep].pulse : []
  // Lapsed projects (map badges) and pending expiry popups (Milestone 8.5).
  const expiredIds = useMemo(
    () => [...new Set(allExpired(state, scenario).map((entry) => entry.neighborhood))],
    [state],
  )
  const bubbles = useMemo(() => expiryBubbles(state, scenario), [state])

  const dispatch = useCallback(
    (command: Command) => {
      const result = store.dispatch(command)
      setReason(result.ok ? null : result.reason)
      const sound = result.ok ? COMMAND_SOUNDS[command.type] : 'refuse'
      if (sound) playSound(sound)
    },
    [store],
  )

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
  }, [state])

  // Generated ambience: on while playing; livelier as the town gets greener;
  // hushed while paused. Volume follows the settings.
  useEffect(() => {
    startAmbience()
    return () => stopAmbience()
  }, [])
  const green = Math.round(townNeedAverage(state, scenario, 'green') * 20) / 20
  useEffect(() => {
    refreshAmbience({ green, paused: state.speed === 0 })
  }, [green, state.speed, settings])

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
          busLines={state.busLines}
          pulseIds={pulseIds}
          expiredIds={expiredIds}
          bubbles={bubbles}
          onRenew={handleRenew}
          onDismiss={handleDismissExpiry}
          state={state}
          reducedMotion={settings.reducedMotion}
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
                onSelect={(id) => {
                  setDrawer(null)
                  onSelectionChange(id)
                }}
              />
            ),
            research: <ResearchMenu state={state} onResearch={(tech) => dispatch({ type: 'research', tech })} />,
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
            <button type="button" onClick={() => dispatch({ type: 'clearMilestoneNotices' })}>
              {t('milestones.gotIt')}
            </button>
          </div>
        )}
      </div>
      <p className="app-help">{t('app.help')}</p>
    </div>
  )
}
