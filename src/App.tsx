import { useCallback, useEffect, useState } from 'react'
import TopBar from './ui/TopBar'
import TownMap from './ui/TownMap'
import NeighborhoodPanel from './ui/NeighborhoodPanel'
import { loadScenario, neighborhoodById } from './game/scenario'
import { createGameStore } from './game/store'
import { useGame } from './ui/useGame'
import type { Command, Reason } from './game/types'
import { t } from './ui/i18n'
import './App.css'

const scenario = loadScenario()
const store = createGameStore()

// App owns the selected neighborhood; the simulation state lives in the store
// (src/game/store.ts, a fixed-timestep loop owning a plain GameState). TownMap
// is a controlled canvas; the panel mutates the world through store.dispatch,
// which is the only way commands reach the state (Milestone 3/4).
function App() {
  const state = useGame(store)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [reason, setReason] = useState<Reason | null>(null)
  const onSelectionChange = useCallback((id: string | null) => setSelectedId(id), [])
  const selected = selectedId ? neighborhoodById(scenario, selectedId) : null

  useEffect(() => {
    store.start()
    return () => store.stop()
  }, [])

  const dispatch = useCallback((command: Command) => {
    const result = store.dispatch(command)
    setReason(result.ok ? null : result.reason)
  }, [])

  return (
    <div className="app">
      <TopBar state={state} onSpeed={(speed) => dispatch({ type: 'setSpeed', speed })} />
      <div className="stage">
        <TownMap selectedId={selectedId} onSelectionChange={onSelectionChange} />
        {selected && (
          <NeighborhoodPanel
            neighborhood={selected}
            state={state}
            onStart={dispatch}
            onRemove={dispatch}
            onClose={() => setSelectedId(null)}
          />
        )}
        {reason && (
          <div className="reason-banner" role="alert">
            <span>{t(`reason.${reason}`)}</span>
            <button type="button" onClick={() => setReason(null)} aria-label={t('reason.dismiss')}>
              ×
            </button>
          </div>
        )}
      </div>
      <p className="app-help">{t('app.help')}</p>
    </div>
  )
}

export default App


