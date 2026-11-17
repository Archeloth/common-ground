import { describe, expect, it } from 'vitest'
import { loadScenario } from './scenario'
import { applyCommand, initialState } from './state'
import { advanceStories, loadStories, parseStoryNoticeKey, storyNoticeKey } from './stories'
import { finishConstruction } from './testHelpers'
import { validateGameState } from './validate'
import type { GameState } from './types'

const scenario = loadScenario()

describe('citizen stories catalog', () => {
  it('has five to ten residents, each living in a real district', () => {
    const residents = loadStories(scenario)
    expect(residents.length).toBeGreaterThanOrEqual(5)
    expect(residents.length).toBeLessThanOrEqual(10)
    for (const r of residents) expect(scenario.neighborhoods.some((n) => n.id === r.neighborhood), r.id).toBe(true)
  })

  it('round-trips notice keys', () => {
    expect(parseStoryNoticeKey(storyNoticeKey('edith', 2))).toEqual({ resident: 'edith', chapter: 2 })
    expect(parseStoryNoticeKey('nonsense')).toBeNull()
  })
})

describe('advanceStories', () => {
  it('stays quiet in the first two months', () => {
    const s = { ...initialState(scenario), day: 31 }
    expect(advanceStories(s, scenario)).toBe(s)
  })

  it('reveals at most one chapter per check', () => {
    // Late in the game every introduction is due at once.
    const s = { ...initialState(scenario), day: 400 }
    const after = advanceStories(s, scenario)
    expect(after.storyNotices).toHaveLength(1)
    expect(Object.values(after.stories).reduce((a, b) => a + b, 0)).toBe(1)
    expect(validateGameState(after)).toEqual([])
  })

  it('introduces everyone before anyone moves on to a second chapter', () => {
    let s: GameState = { ...initialState(scenario), day: 400 }
    // Everything Priya's second chapter needs is in place from the start.
    const r = applyCommand({ ...s, budget: 99999, time: 99 }, {
      type: 'startProject',
      neighborhood: 'station_quarter',
      project: 'safe_streets',
    })
    if (!r.ok) throw new Error(r.reason)
    s = finishConstruction(r.state)
    const residents = loadStories(scenario)
    for (let i = 0; i < residents.length; i++) s = advanceStories(s, scenario)
    for (const resident of residents) expect(s.stories[resident.id], resident.id).toBe(1)
    s = advanceStories(s, scenario)
    expect(s.stories.priya).toBe(2)
  })

  it('waits for the district to change before the next chapter', () => {
    let s: GameState = { ...initialState(scenario), day: 400, stories: { edith: 1 } }
    for (const r of loadStories(scenario)) if (r.id !== 'edith') s = { ...s, stories: { ...s.stories, [r.id]: r.chapters.length } }
    expect(advanceStories(s, scenario)).toBe(s)
  })

  it('lets the player read a postcard and put it away', () => {
    const s = advanceStories({ ...initialState(scenario), day: 400 }, scenario)
    const key = s.storyNotices[0]
    const r = applyCommand(s, { type: 'dismissStoryNotice', notice: key })
    if (!r.ok) throw new Error(r.reason)
    expect(r.state.storyNotices).toEqual([])
    expect(r.state.stories).toEqual(s.stories)
  })
})
