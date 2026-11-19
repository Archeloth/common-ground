import type { ScenarioDef, TransportMode } from './types'

// How a town links its districts (Milestone 10): buses in Willowbrook, a
// shared minibus in a Sahel village, river boats in an Amazon town. The rules
// are the same for every mode (startBusLine, busLines, cost, upkeep and the
// mobility bonus); only the research that unlocks it, its name and its look
// differ.

export const TRANSPORT_MODES = ['bus', 'minibus', 'boat'] as const

export interface Transport {
  mode: TransportMode
  requiresTech: string
}

export function transportOf(scenario: ScenarioDef): Transport {
  return {
    mode: scenario.transport?.mode ?? 'bus',
    requiresTech: scenario.transport?.requiresTech ?? 'public_transport',
  }
}

// The line's name inside guidance hints, which the game layer builds.
export const LINE_NAMES: Record<TransportMode, string> = {
  bus: 'bus line',
  minibus: 'minibus route',
  boat: 'boat route',
}
