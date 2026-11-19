import { afterEach, describe, expect, it } from 'vitest'
import {
  activeScenarioId,
  getScenario,
  listScenarios,
  loadScenario,
  scenarioIds,
  setActiveScenario,
} from './scenario'
import { loadMilestones } from './milestones'
import { messageCatalog } from './messages'
import { loadStories } from './stories'
import { initialState } from './state'
import { TUTORIAL_DONE } from './tutorial'
import { createGameStore } from './store'
import { validateGameState } from './validate'

// Milestone 10: the scenario registry. Every town validates with its own
// content, and switching towns never serves another town's cached content.

afterEach(() => {
  setActiveScenario('willowbrook')
})

describe('the scenario registry', () => {
  it('starts on Willowbrook and lists it first', () => {
    expect(activeScenarioId()).toBe('willowbrook')
    expect(listScenarios()[0].id).toBe('willowbrook')
    expect(scenarioIds()).toContain('hollin_green')
  })

  it.each(scenarioIds())('%s validates with its chapters, messages and stories', (id) => {
    const scenario = getScenario(id)
    expect(scenario.id).toBe(id)
    for (const text of [scenario.name, scenario.region, scenario.tagline, scenario.blurb]) expect(text.trim()).not.toBe('')
    expect(loadMilestones(id).length).toBeGreaterThan(0)
    expect(messageCatalog(id)).toHaveLength(scenario.neighborhoods.length)
    expect(() => loadStories(scenario)).not.toThrow()
    expect(validateGameState(initialState(scenario))).toEqual([])
  })

  it('refuses an unknown town', () => {
    expect(() => setActiveScenario('atlantis')).toThrow(/unknown town/)
    expect(activeScenarioId()).toBe('willowbrook')
  })

  it('switching towns switches every content loader', () => {
    const willowChapters = loadMilestones().map((m) => m.id)
    setActiveScenario('hollin_green')
    expect(loadScenario().id).toBe('hollin_green')
    expect(loadMilestones().map((m) => m.id)).not.toEqual(willowChapters)
    const districts = new Set(loadScenario().neighborhoods.map((n) => n.id))
    for (const message of messageCatalog()) expect(districts.has(message.neighborhood)).toBe(true)
    expect(loadStories(loadScenario())).toEqual([]) // a quick game has no stories yet
    setActiveScenario('willowbrook')
    expect(loadMilestones().map((m) => m.id)).toEqual(willowChapters)
  })

  it('a town without the tutorial starts with it finished', () => {
    expect(initialState(getScenario('willowbrook')).tutorialStep).toBe(0)
    expect(initialState(getScenario('hollin_green')).tutorialStep).toBe(TUTORIAL_DONE)
  })

  it('loading a game into the store makes its town active', () => {
    const store = createGameStore()
    store.replaceState(initialState(getScenario('hollin_green')))
    expect(activeScenarioId()).toBe('hollin_green')
    store.replaceState(initialState(getScenario('willowbrook')))
    expect(activeScenarioId()).toBe('willowbrook')
  })
})
