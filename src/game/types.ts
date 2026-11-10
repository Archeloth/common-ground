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

// ---------------------------------------------------------------------------
// Projects and player commands (Milestone 3).

export interface ProjectEffect {
  // Additive change to a need coverage (clamped into [0, 1] when applied).
  need: NeedId
  change: number
}

export interface ProjectDef {
  id: string
  name: string
  explain: string // one sentence, shown in the picker
  cost: number // Budget units (scenario start.budget)
  time: number // Community time in months (scenario start.time)
  engagement: number // engagement delta (usually positive)
  effects: ProjectEffect[]
  allowedKinds: NeighborhoodKind[] // which kinds may host this project
}

// Player commands against the simulation state.
export type Command =
  | { type: 'start_project'; neighborhood: string; project: string }
  | { type: 'remove_project'; neighborhood: string; slot: number }

// Machine-readable refusal codes; the UI maps each to t("reason.<code>").
export type Reason =
  | 'unknown_neighborhood'
  | 'unknown_project'
  | 'project_already_active'
  | 'no_free_slot'
  | 'not_allowed_in_kind'
  | 'insufficient_budget'
  | 'insufficient_time'
  | 'invalid_slot'
  | 'empty_slot'

export type CommandResult = { ok: true; state: GameState } | { ok: false; reason: Reason }

// The entire mutable simulation state, as plain JSON-friendly data (coding
// standard 6): a save file can be a JSON.stringify snapshot of this object.
export interface GameState {
  budget: number
  time: number // community time in months
  // neighborhoodId -> project id per slot (null = empty slot)
  projects: Record<string, Array<string | null>>
}

