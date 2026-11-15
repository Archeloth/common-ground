import { describe, expect, it } from 'vitest'
import { loadScenario } from '../game/scenario'
import { initialState } from '../game/state'
import { loadMilestones } from '../game/milestones'
import type { MilestoneCondition } from '../game/milestones'
import { taskMet, taskText } from './goalText'

const state = initialState(loadScenario())

describe('goal tracker task text', () => {
  it('words every condition type with its live progress', () => {
    const cases: Array<[MilestoneCondition, RegExp]> = [
      [{ type: 'projectIn', neighborhood: 'weir_bend', project: 'rain_garden' }, /Rain garden.*Weir Bend/],
      [{ type: 'projectCount', project: 'safe_streets', min: 3 }, /Safe streets: 0 of 3/],
      [{ type: 'slotsFilled', min: 6 }, /0 of 6/],
      [{ type: 'busLineCount', min: 1 }, /Bus lines: 0 of 1/],
      [{ type: 'townSatisfaction', min: 64 }, /Town satisfaction: 60 of 64/],
      [{ type: 'needsAverage', need: 'mobility', min: 0.65 }, /Mobility: 52% of 65%/],
    ]
    for (const [condition, pattern] of cases) expect(taskText(state, condition)).toMatch(pattern)
  })

  it('has wording for every task of every shipped chapter (no raw keys)', () => {
    for (const def of loadMilestones()) {
      for (const condition of def.conditions) expect(taskText(state, condition)).not.toMatch(/^town\.task\./)
    }
  })

  it('is not met at the start for chapter 1 (the goal is a real target)', () => {
    const [first] = loadMilestones()
    expect(first.conditions.every((c) => taskMet(state, c))).toBe(false)
    const satisfaction = first.conditions.find((c) => c.type === 'townSatisfaction')!
    expect(taskMet(state, satisfaction)).toBe(false)
  })
})
