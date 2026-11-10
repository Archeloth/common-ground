import { useCallback, useState } from 'react'
import TownMap from './ui/TownMap'
import NeighborhoodPanel from './ui/NeighborhoodPanel'
import { loadScenario, neighborhoodById } from './game/scenario'
import { applyCommand, initialState } from './game/state'
import type { Command, GameState, Reason } from './game/types'
import { t } from './ui/i18n'
import './App.css'

const scenario = loadScenario()

// App owns the simulation state and the selected neighborhood; TownMap is a
// controlled canvas (selection lifted — Milestone 2), the panel mutates the
// world through applyCommand only (Milestone 3). No store yet: the fixed-
// timestep loop arrives in Milestone 4.
function App() {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [state, setState] = useState<GameState>(() => initialState(scenario))
  const [reason, setReason] = useState<Reason | null>(null)
  const onSelectionChange = useCallback((id: string | null) => setSelectedId(id), [])
  const selected = selectedId ? neighborhoodById(scenario, selectedId) : null

  const dispatch = useCallback(
    (command: Command) => {
      const result = applyCommand(state, command)
      if (result.ok) {
        setState(result.state)
        setReason(null)
      } else {
        setReason(result.reason)
      }
    },
    [state],
  )

  return (
    <div className="app">
      <header className="app-header">
        <h1>{t('app.title')}</h1>
        <span className="app-status">{t('app.status')}</span>
        <div className="resource-chips">
          <span className="resource-chip">
            {t('resources.budget')}: {state.budget.toLocaleString('en-GB')}
          </span>
          <span className="resource-chip">
            {t('resources.time')}: {state.time} {t('resource.month')}
          </span>
        </div>
      </header>
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


