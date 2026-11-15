import { describe, expect, it } from 'vitest'
import { loadScenario } from './scenario'
import { loadProjects } from './projects'
import { applyCommand, initialState } from './state'
import {
  applyMessageReward,
  loadMessages,
  messageCatalog,
  messageForNeighborhood,
  messageFulfilled,
} from './messages'

const scenario = loadScenario()

describe('resident messages', () => {
  it('has exactly one message per scenario neighborhood', () => {
    const messages = loadMessages()
    expect(messages).toHaveLength(scenario.neighborhoods.length)
    const neighborhoods = new Set(messages.map((m) => m.neighborhood))
    expect(neighborhoods.size).toBe(scenario.neighborhoods.length)
  })

  it('requests an existing project and carries a positive reward', () => {
    const projectIds = new Set(loadProjects().map((p) => p.id))
    for (const def of loadMessages()) {
      expect(projectIds, def.id).toContain(def.request.project)
      const reward = (def.reward.budget ?? 0) + (def.reward.time ?? 0) + (def.reward.knowledge ?? 0)
      expect(reward, def.id).toBeGreaterThan(0)
      expect(def.text.trim().length, def.id).toBeGreaterThan(10)
    }
  })

  it('finds a message by neighborhood', () => {
    const def = messageForNeighborhood('linden_flats')
    expect(def.request.project).toBe('retrofit_program')
  })

  it('is fulfilled when the requested project runs in the neighborhood', () => {
    const def = messageForNeighborhood('old_town')
    const fresh = { ...initialState(scenario), research: [...initialState(scenario).research, 'building_retrofits'] }
    expect(messageFulfilled(fresh, def)).toBe(false)
    const started = applyCommand(fresh, {
      type: 'startProject',
      neighborhood: 'old_town',
      project: def.request.project,
    })
    expect(started.ok).toBe(true)
    if (started.ok) expect(messageFulfilled(started.state, def)).toBe(true)
  })

  it('applies a reward without mutating the input', () => {
    const def = messageForNeighborhood('old_town') // +5 knowledge
    const s = initialState(scenario)
    const snapshot = structuredClone(s)
    const rewarded = applyMessageReward(s, def)
    expect(rewarded.knowledge).toBe(s.knowledge + (def.reward.knowledge ?? 0))
    expect(rewarded.budget).toBe(s.budget)
    expect(rewarded.time).toBe(s.time)
    expect(s).toEqual(snapshot)
  })

  it('the catalog is stable and square with the scenario (data sanity)', () => {
    const defs = messageCatalog()
    const ids = new Set(defs.map((d) => d.id))
    expect(ids.size).toBe(defs.length)
    for (const def of defs) expect(scenario.neighborhoods.some((n) => n.id === def.neighborhood)).toBe(true)
  })
})