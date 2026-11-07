import { useCallback, useState } from 'react'
import TownMap from './ui/TownMap'
import NeighborhoodPanel from './ui/NeighborhoodPanel'
import { loadScenario, neighborhoodById } from './game/scenario'
import { t } from './ui/i18n'
import './App.css'

const scenario = loadScenario()

function App() {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const onSelectionChange = useCallback((id: string | null) => setSelectedId(id), [])
  const selected = selectedId ? neighborhoodById(scenario, selectedId) : null

  return (
    <div className="app">
      <header className="app-header">
        <h1>{t('app.title')}</h1>
        <span className="app-status">{t('app.status')}</span>
      </header>
      <div className="stage">
        <TownMap selectedId={selectedId} onSelectionChange={onSelectionChange} />
        {selected && <NeighborhoodPanel neighborhood={selected} onClose={() => setSelectedId(null)} />}
      </div>
      <p className="app-help">{t('app.help')}</p>
    </div>
  )
}

export default App

