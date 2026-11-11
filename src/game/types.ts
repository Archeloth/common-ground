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
    knowledge?: number // starting Knowledge (research currency; more comes from milestones)
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

// Player commands against the simulation state. Types follow the plan's core
// command pattern (startProject/removeProject/setSpeed) so replays, undo and
// tutorial scripting stay simple.
export type Speed = 0 | 1 | 2 | 4

export type Command =
  | { type: 'startProject'; neighborhood: string; project: string }
  | { type: 'removeProject'; neighborhood: string; slot: number }
  | { type: 'setSpeed'; speed: Speed }
  | { type: 'research'; tech: string }
  | { type: 'clearMilestoneNotices' }

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
  | 'invalid_speed'
  | 'unknown_tech'
  | 'already_researched'
  | 'prerequisites_not_met'
  | 'insufficient_knowledge'

export type CommandResult = { ok: true; state: GameState } | { ok: false; reason: Reason }

// One entry in the "top shortfalls" reasons list: the need and its current
// coverage, so the UI can explain the satisfaction level in plain words.
export interface ReasonEntry {
  need: NeedId
  coverage: number // 0 to 1
}

// The dynamic simulation part of a neighborhood (Milestone 4). Needs are no
// longer static content: coverage drifts toward the target set by the base
// needs plus active project effects every tick.
export interface NeighborhoodSimState {
  needs: Needs
  satisfaction: number // smoothed, displayed value, 0 to 100
  reasons: ReasonEntry[] // the three largest shortfalls, biggest gap first
}

// The entire mutable simulation state, as plain JSON-friendly data (coding
// standard 6): a save file can be a JSON.stringify snapshot of this object.
export interface GameState {
  budget: number
  time: number // community time (volunteer effort)
  knowledge: number // earned from milestones now; schools/libraries arrive later
  day: number // one tick = one in-game day
  speed: Speed
  // neighborhoodId -> project id per slot (null = empty slot)
  projects: Record<string, Array<string | null>>
  // neighborhoodId -> dynamic per-neighborhood simulation values
  neighborhoods: Record<string, NeighborhoodSimState>
  // Researched technology ids (Milestone 6), seeded from the scenario's
  // start.unlockedTech; research costs knowledge.
  research: string[]
  // Completed milestone ids (Milestone 6), one per chapter.
  milestones: string[]
  // Milestone ids completed since the player last dismissed the banner.
  milestoneNotices: string[]
}

