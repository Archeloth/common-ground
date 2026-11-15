import { describe, expect, it } from 'vitest'
import { loadScenario } from './scenario'
import { applyCommand, initialState } from './state'
import { tick } from './tick'
import {
  advanceTutorial,
  currentTutorialStep,
  TUTORIAL_DONE,
  TUTORIAL_STEPS,
} from './tutorial'

const scenario = loadScenario()

describe('tutorial steps', function () {
  it('defines five steps ending in the done sentinel', function () {
    expect(TUTORIAL_STEPS).toHaveLength(TUTORIAL_DONE)
    const ids = new Set(TUTORIAL_STEPS.map((s) => s.id))
    expect(ids.size).toBe(TUTORIAL_STEPS.length)
    for (const step of TUTORIAL_STEPS) {
      for (const id of step.pulse) {
        expect(scenario.neighborhoods.some((n) => n.id === id), 'pulse ' + id).toBe(true)
      }
    }
  })

  it('starts at the intro step and only the Continue button advances it', function () {
    let state = initialState(scenario)
    expect(currentTutorialStep(state)?.id).toBe('intro')
    expect(tick(state).tutorialStep).toBe(0)
    const cont = applyCommand(state, { type: 'tutorialNext' })
    if (!cont.ok) throw new Error('tutorialNext refused')
    state = cont.state
    expect(currentTutorialStep(state)?.id).toBe('garden')
  })

  it('walks the full tutorial: garden, watch, research, retrofit, done', function () {
    let state = initialState(scenario)
    const cont = applyCommand(state, { type: 'tutorialNext' })
    if (!cont.ok) throw new Error('tutorialNext refused')
    state = cont.state

    // garden step completes on the tick after the project starts
    const garden = applyCommand(state, {
      type: 'startProject',
      neighborhood: 'school_green',
      project: 'community_garden',
    })
    if (!garden.ok) throw new Error('garden refused')
    state = tick(garden.state)
    expect(state.tutorialStep).toBe(2)

    // watch: food climbs past 0.83 within a month of ticks
    for (let i = 0; i < 40 && state.tutorialStep === 2; i++) state = tick(state)
    expect(state.tutorialStep).toBe(3)

    // research
    const research = applyCommand(state, { type: 'research', tech: 'building_retrofits' })
    if (!research.ok) throw new Error('research refused')
    state = tick(research.state)
    expect(state.tutorialStep).toBe(4)

    // retrofit anywhere
    const retrofit = applyCommand(state, {
      type: 'startProject',
      neighborhood: 'old_town',
      project: 'retrofit_program',
    })
    if (!retrofit.ok) throw new Error('retrofit refused')
    state = tick(retrofit.state)
    expect(state.tutorialStep).toBe(TUTORIAL_DONE)
    expect(currentTutorialStep(state)).toBeNull()
  })

  it('advanceTutorial is pure and returns the same state when nothing advances', function () {
    const s = initialState(scenario)
    const next = advanceTutorial(s, scenario)
    expect(next).toBe(s)
  })
})