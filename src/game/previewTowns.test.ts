import { afterEach, describe, expect, it } from 'vitest'
import { listScenarios, setActiveScenario } from './scenario'
import { applyCommand, initialState } from './state'
import { tick } from './tick'
import { validateGameState } from './validate'
import { loadMilestones } from './milestones'
import { projectsFor, techTreeFor } from './regionContent'
import { TICKS_PER_MONTH } from './constants'
import type { Command, GameState, ScenarioDef } from './types'

// Milestone 10 preview regions: a smoke test, not a balance test. A simple
// bot (research what it can afford, link neighbours, then build whatever the
// next chapter asks for, else anything) plays each preview town for four
// years. The town must stay valid; how far it gets is printed for the
// playtest notes.

afterEach(() => setActiveScenario('willowbrook'))

function act(state: GameState, town: ScenarioDef): Command | null {
  for (const tech of techTreeFor(town)) {
    const command: Command = { type: 'research', tech: tech.id }
    if (applyCommand(state, command).ok) return command
  }
  for (const n of town.neighborhoods) {
    for (const other of n.neighbors) {
      const command: Command = { type: 'startBusLine', from: n.id, to: other }
      if (applyCommand(state, command).ok) return command
    }
  }
  const next = loadMilestones(town.id).find((m) => !state.milestones.includes(m.id))
  const wanted = new Set(
    (next?.conditions ?? []).flatMap((c) => ('project' in c ? [c.project] : [])),
  )
  const projects = [...projectsFor(town)].sort((a, b) => Number(wanted.has(b.id)) - Number(wanted.has(a.id)))
  for (const p of projects) {
    for (const n of town.neighborhoods) {
      const command: Command = { type: 'startProject', neighborhood: n.id, project: p.id }
      if (applyCommand(state, command).ok) return command
    }
  }
  return null
}

describe('the preview regions can be played', () => {
  const previews = listScenarios().filter((s) => s.preview)

  it('there are three preview regions', () => {
    expect(previews.map((s) => s.theme).sort()).toEqual(['amazon', 'east_asia', 'sahel'])
  })

  it.each(previews.map((s) => [s.name, s] as const))('%s runs four years with a simple bot and stays valid', (_name, town) => {
    setActiveScenario(town.id)
    let state = initialState(town)
    for (let day = 0; day < 4 * 12 * TICKS_PER_MONTH; day++) {
      if (day % TICKS_PER_MONTH === 0) {
        for (let i = 0; i < 6; i++) {
          const command = act(state, town)
          if (!command) break
          const result = applyCommand(state, command)
          if (!result.ok) break
          state = result.state
        }
      }
      state = tick(state)
    }
    expect(validateGameState(state)).toEqual([])
    const chapters = loadMilestones(town.id).filter((m) => state.milestones.includes(m.id)).map((m) => m.chapter)
    console.log(`${town.name}: chapters ${chapters.join(', ') || 'none'} after four years`)
  })
})
