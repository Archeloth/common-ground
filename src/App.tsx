import TownMap from './ui/TownMap'
import './App.css'

function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1>Common Ground</h1>
        <span className="app-status">Willowbrook · Milestone 1</span>
      </header>
      <TownMap />
      <p className="app-help">Drag to pan · scroll to zoom · click a neighborhood</p>
    </div>
  )
}

export default App

