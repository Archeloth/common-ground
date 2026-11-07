// Plain JSON-friendly data types shared by the simulation and the UI.
//
// No classes, Maps or Sets — just arrays and records, so a save can be
// JSON.stringify later (development plan, coding standards item 6).
// Content ids use snake_case ("community_garden"), components PascalCase.

// The eight neighborhood kinds. The array is the single source of truth: the
// union type is derived from it, so a new kind automatically forces a catalog
// entry in data/neighborhoods.json and the kinds test keeps them in sync.
export const NEIGHBORHOOD_KINDS = [
  'old_town',
  'apartments',
  'suburb',
  'riverside',
  'industrial_edge',
  'retail_park',
  'farmland',
  'woodland',
] as const

export type NeighborhoodKind = (typeof NEIGHBORHOOD_KINDS)[number]

export type NeedId = 'energy' | 'food' | 'mobility' | 'green' | 'waste' | 'housing'

// Need coverage ratios (0 to 1): min(1, supply / demand).
export interface Needs {
  energy: number
  food: number
  mobility: number
  green: number
  waste: number
  housing: number
}

// Hand-picked shape of a neighborhood's blob (plan: "pick each seed by eye").
export interface Shape {
  x: number
  y: number
  radius: number
  seed: number
}

export interface NeighborhoodDef {
  id: string
  name: string
  kind: NeighborhoodKind
  residents: number
  slots: number
  engagement: number // 0 to 100
  needs: Needs
  shape: Shape
  neighbors: string[] // ids of adjacent neighborhoods (incl. across bridges)
}

export interface ScenarioDef {
  id: string
  name: string
  start: {
    budget: number
    time: number
    unlockedTech: string[]
  }
  neighborhoods: NeighborhoodDef[]
  bridges: [string, string][]
}
