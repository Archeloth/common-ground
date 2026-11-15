import type { GameState, ScenarioDef } from './types'

// The tutorial (Milestone 8) is a short, scripted first fifteen minutes in the
// spirit of the plan: a neighbourhood with a problem, one community garden,
// watching the bars move, one research step and one retrofit. Steps are
// conditions on state (pure functions), so pacing is easy to retune and replays
// stay deterministic; the spoken text lives in i18n under "tutorial.<id>".
//
// Info steps (intro) advance only through the player's "Continue" button (the
// tutorialNext command); action steps auto-complete in tick() the moment their
// condition is met, so the card can say "this step completes by itself".

export interface TutorialStep {
  id: string
  pulse: string[] // neighborhood ids the map should highlight
  complete(state: GameState, scenario: ScenarioDef): boolean
}

// Sentinel for a finished tutorial; also the clamp for tutorialNext.
export const TUTORIAL_DONE = 5

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'intro',
    // Three neighbourhoods with visible problems (plan minute 0-1): little
    // green space (School Green), high energy use (Linden Flats) and the
    // worst mobility (Southgate Retail).
    pulse: ['school_green', 'linden_flats', 'southgate_retail'],
    // Only the player's "Continue" button advances this step.
    complete() { return false },
  },
  {
    id: 'garden',
    pulse: ['school_green'],
    complete: (state) => (state.projects.school_green ?? []).includes('community_garden'),
  },
  {
    id: 'watch',
    pulse: ['school_green'],
    // The garden pushes food from 0.80 toward 0.92; 0.83 means it is visibly
    // rising (roughly a fortnight of ticks), so the player sees the bars move.
    complete: (state) => (state.neighborhoods.school_green?.needs.food ?? 0) >= 0.83,
  },
  {
    id: 'research',
    pulse: [],
    complete: (state) => state.research.includes('building_retrofits'),
  },
  {
    id: 'retrofit',
    pulse: ['old_town'],
    complete: (state) =>
      Object.values(state.projects).some((slots) => slots.includes('retrofit_program')),
  },
]

export function currentTutorialStep(state: GameState): TutorialStep | null {
  if (state.tutorialStep >= TUTORIAL_DONE) return null
  return TUTORIAL_STEPS[state.tutorialStep]
}

// Advance past any steps whose condition is already met (deterministic, called
// every tick). Returns the same state object when nothing advances.
export function advanceTutorial(state: GameState, scenario: ScenarioDef): GameState {
  if (state.tutorialStep >= TUTORIAL_DONE) return state
  let step = state.tutorialStep
  while (step < TUTORIAL_DONE && TUTORIAL_STEPS[step].complete(state, scenario)) step++
  return step === state.tutorialStep ? state : { ...state, tutorialStep: step }
}