import { describe, expect, it } from 'vitest'
import { loadScenario } from './scenario'
import { applyCommand, initialState } from './state'
import { loadMilestones } from './milestones'
import { nextAction } from './guidance'
import { TUTORIAL_DONE } from './tutorial'
import type { GameState } from './types'

const scenario = loadScenario()

// A finished tutorial, so the guide looks at the open goals instead.
function pastTutorial(): GameState {
  return { ...initialState(scenario), tutorialStep: TUTORIAL_DONE }
}

// The same, with Building retrofits already researched.
function researched(): GameState {
  const s = pastTutorial()
  return { ...s, research: [...s.research, 'building_retrofits'] }
}

function allMessagesDone(): GameState['messages'] {
  return Object.fromEntries(scenario.neighborhoods.map((n) => [n.id, 'done'])) as GameState['messages']
}

function allMilestonesDone() {
  return loadMilestones().map((m) => m.id)
}

describe('nextAction (what should I do next?)', function () {
  it('points at the current tutorial step while the tutorial is running', function () {
    const action = nextAction(initialState(scenario))
    expect(action?.kind).toBe('tutorial')
    expect(action?.neighborhoodId).toBe('school_green')
  })

  it('after the tutorial, points at the first unfulfilled milestone condition', function () {
    const action = nextAction(pastTutorial())
    expect(action?.kind).toBe('milestone')
    expect(action?.neighborhoodId).toBe('linden_flats')
    expect(action?.projectId).toBe('community_garden')
  })

  it('asks to research Building retrofits when the goal needs a retrofit', function () {
    const garden = applyCommand(pastTutorial(), {
      type: 'startProject',
      neighborhood: 'linden_flats',
      project: 'community_garden',
    })
    if (!garden.ok) throw new Error('garden refused')
    const action = nextAction(garden.state)
    expect(action?.textKey).toBe('guide.research')
    expect(action?.projectId).toBe('retrofit_program')
  })

  it('asks for another retrofit once the Linden Flats garden is built', function () {
    let state = researched()
    const garden = applyCommand(state, {
      type: 'startProject',
      neighborhood: 'linden_flats',
      project: 'community_garden',
    })
    if (!garden.ok) throw new Error('garden refused')
    state = garden.state
    const action = nextAction(state)
    expect(action?.kind).toBe('milestone')
    expect(action?.projectId).toBe('retrofit_program')
  })

  it('falls back to an open resident message when milestones are complete', function () {
    const messages = allMessagesDone()
    messages.old_town = 'open' // Old Town still asks for a retrofit programme
    const state = {
      ...researched(),
      milestones: allMilestonesDone(),
      messages,
    }
    const action = nextAction(state)
    expect(action?.kind).toBe('message')
    expect(action?.neighborhoodId).toBe('old_town')
    expect(action?.projectId).toBe('retrofit_program')
  })

  it('falls back to the biggest need gap with a reachable project', function () {
    const state = {
      ...researched(),
      milestones: allMilestonesDone(),
      messages: allMessagesDone(),
    }
    const action = nextAction(state)
    expect(action?.kind).toBe('need')
    expect(action?.neighborhoodId).toBe('linden_flats') // housing 0.38 is the biggest gap
    expect(action?.projectId).toBe('retrofit_program')
    expect(action?.needId).toBe('housing')
  })

  it('returns null when every goal is met and nothing is affordable', function () {
    const state = {
      ...pastTutorial(),
      milestones: allMilestonesDone(),
      messages: allMessagesDone(),
      budget: 0,
      time: 0,
      knowledge: 0,
    }
    expect(nextAction(state)).toBeNull()
  })

  it('walks the research chain, then suggests earning Knowledge when it is out of reach', function () {
    // Chapter 3 needs a rain garden: Rain gardens needs Urban trees first.
    const ch3 = {
      ...pastTutorial(),
      milestones: ['first_steps', 'getting_around'],
      messages: allMessagesDone(),
      knowledge: 25,
    }
    const step = nextAction(ch3)
    expect(step?.textKey).toBe('guide.researchStep')
    expect(step?.params.tech).toBe('Urban trees and green roofs')
    // Too little Knowledge for Urban trees (20) but enough for Community learning (10).
    expect(nextAction({ ...ch3, knowledge: 12 })?.textKey).toBe('guide.learnFirst')
    // With Community learning researched, a workshop series is the way.
    const learned = { ...ch3, knowledge: 2, research: [...ch3.research, 'community_learning'] }
    const action = nextAction(learned)
    expect(action?.textKey).toBe('guide.needKnowledge')
    expect(action?.projectId).toBe('workshop_series')
  })
})
