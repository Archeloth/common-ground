import { describe, expect, it } from 'vitest'
import { loadScenario } from './scenario'
import { applyCommand, initialState } from './state'
import { tick } from './tick'
import { volunteerCap } from './economy'
import { loadTechnologies } from './technologies'
import { TUTORIAL_DONE } from './tutorial'
import type { Command, GameState } from './types'

// Loose guards for the balance pass. They protect the shape of the economy
// (scarce early, never broken), not exact numbers, so tuning stays free.
const scenario = loadScenario()

// A simple eager player: researches the cheapest affordable tech, then builds
// the first affordable project anywhere, a few actions each month.
function eagerPlay(years: number): { states: GameState[] } {
  const techs = [...loadTechnologies()].sort((a, b) => a.cost - b.cost)
  let s: GameState = { ...initialState(scenario), tutorialStep: TUTORIAL_DONE }
  const states: GameState[] = []
  for (let day = 0; day < years * 360; day++) {
    if (day % 30 === 0) {
      for (let k = 0; k < 6; k++) {
        let cmd: Command | null = null
        for (const tech of techs) {
          if (applyCommand(s, { type: 'research', tech: tech.id }).ok) {
            cmd = { type: 'research', tech: tech.id }
            break
          }
        }
        outer: for (const n of scenario.neighborhoods) {
          if (cmd) break
          for (const p of ['community_garden', 'rooftop_solar', 'safe_streets', 'pocket_meadow', 'retrofit_program']) {
            const c: Command = { type: 'startProject', neighborhood: n.id, project: p }
            if (applyCommand(s, c).ok) {
              cmd = c
              break outer
            }
          }
        }
        if (!cmd) break
        const r = applyCommand(s, cmd)
        if (r.ok) s = r.state
      }
    }
    s = tick(s)
    states.push(s)
  }
  return { states }
}

describe('balance guards', () => {
  const { states } = eagerPlay(4)

  it('keeps money finite and never negative', () => {
    for (const s of states) {
      expect(Number.isFinite(s.budget)).toBe(true)
      expect(s.budget).toBeGreaterThanOrEqual(0)
    }
  })

  it('never lets volunteers pile up above the cap', () => {
    for (const s of states) expect(s.time).toBeLessThanOrEqual(volunteerCap(s, scenario))
  })

  it('does not let money pile up (before the balance pass: ~90,000 by year 3)', () => {
    // This player is held back by volunteers, not money, so it banks the most.
    expect(states[3 * 360 - 1].budget).toBeLessThan(40000)
  })

  it('does not hand out the whole research tree in the first two years', () => {
    expect(states[2 * 360 - 1].research.length).toBeLessThan(loadTechnologies().length)
  })
})
