// Plain JSON-friendly data types shared by the simulation and the UI.
//
// No classes, Maps or Sets - just arrays and records, so a save can be
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

// Hand-picked shape of a neighborhood blob (plan: "pick each seed by eye").
export interface Shape {
  x: number
  y: number
  radius: number
  seed: number
}

// A plain 2D world point (river polyline, bridge positions).
export interface WorldPoint {
  x: number
  y: number
}

export interface BridgeDef {
  from: string
  to: string
  point: WorldPoint
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
  // The river is content too (Milestone 8.5): a polyline to draw and to test
  // bus-line crossings against, plus the two fixed bridges that span it.
  river: { points: WorldPoint[]; halfDepth: number }
  bridges: BridgeDef[]
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
  // Research gate (Milestone 8.5): the technology that must be researched
  // before this project can start (e.g. retrofit_program needs building_retrofits).
  requiresTech?: string
  // Project lifetime in months (Milestone 8.5): undefined means permanent
  // capital work. When it runs out the project stops giving effects; the slot
  // stays occupied until the player removes it.
  durationMonths?: number
  // Knowledge paid each month while the project runs (Milestone 8.5): the
  // workshop series is the town's steady Knowledge source.
  knowledgePerMonth: number
  // Which little scene the map draws on the project's plot (Milestone 9).
  // Plain content: the UI checks it against its sprite list in a test.
  visual: string
  // In-game days from starting to finishing (construction time). Nothing
  // works, costs upkeep or counts toward goals until then.
  buildDays: number
}

// Player commands against the simulation state. Types follow the plan core
// command pattern (startProject/removeProject/setSpeed) so replays, undo and
// tutorial scripting stay simple.
export type Speed = 0 | 1 | 2 | 4

export type Command =
  | { type: 'startProject'; neighborhood: string; project: string }
  | { type: 'removeProject'; neighborhood: string; slot: number }
  | { type: 'setSpeed'; speed: Speed }
  | { type: 'research'; tech: string }
  | { type: 'clearMilestoneNotices' }
  | { type: 'townMeeting'; neighborhood: string }
  | { type: 'startBusLine'; from: string; to: string }
  | { type: 'tutorialNext' }
  | { type: 'renewProject'; neighborhood: string; slot: number }
  // Renew every lapsed project the volunteers can cover (playtest).
  | { type: 'renewAll' }
  | { type: 'dismissExpiryNotice'; notice: string }

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
  | 'bus_line_exists'
  | 'not_adjacent'
  | 'tech_not_researched'
  | 'project_permanent'
  | 'renew_too_early'
  | 'nothing_to_renew'
  | 'meeting_cooldown'

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
  // neighborhoodId: project id per slot (null = empty slot)
  projects: { [id: string]: (string | null)[] }
  // neighborhoodId: the day each slot's project runs out (Milestone 8.5).
  // null = permanent or empty; a number always lines up with a project.
  projectExpiry: { [id: string]: (number | null)[] }
  // neighborhoodId: the day each slot's project is finished building
  // (construction time); null = built (or empty).
  projectReady: { [id: string]: (number | null)[] }
  // neighborhoodId: dynamic per-neighborhood simulation values
  neighborhoods: { [id: string]: NeighborhoodSimState }
  // Researched technology ids (Milestone 6), seeded from the scenario
  // start.unlockedTech; research costs knowledge.
  research: string[]
  // Completed milestone ids (Milestone 6), one per chapter.
  milestones: string[]
  // Milestone ids completed since the player last dismissed the banner.
  milestoneNotices: string[]
  // "neighborhood:slot" keys of projects that ran their course and have not
  // been renewed or dismissed yet (Milestone 8.5: a bubble on the district).
  expiryNotices: string[]
  // Dynamic engagement per neighborhood (Milestone 7): rises with town
  // meetings and running projects, keeps the monthly Community-time regen
  // alive and discounts project Community-time costs.
  engagement: { [id: string]: number }
  // The day of each district's last town meeting (absent = never). One
  // meeting per district every TOWN_MEETING_COOLDOWN_DAYS.
  lastMeeting: { [id: string]: number }
  // One point per month for the Town overview's history chart (oldest first,
  // capped at HISTORY_MAX_POINTS).
  history: HistoryPoint[]
  // Bus links between adjacent neighborhoods (Milestone 7): each pair adds
  // BUS_MOBILITY_BONUS to both endpoints' mobility target. Only bridge pairs
  // are adjacent across the river, so lines cross only at the fixed bridges.
  busLines: [string, string][]
  // Resident message status per neighborhood (Milestone 7): 'open' until the
  // request is fulfilled, then 'done' (the reward is paid once).
  messages: { [id: string]: MessageStatus }
  // Index into the tutorial steps (Milestone 8); TUTORIAL_DONE when finished.
  // The intro step advances with the tutorialNext command, action steps with
  // tick() once their condition is met.
  tutorialStep: number
}

export type MessageStatus = 'open' | 'done'

// A month in the town's story: day, town satisfaction (0-100), budget, and the
// town-average coverage of each need (0-1), rounded to keep saves small.
export interface HistoryPoint {
  day: number
  satisfaction: number
  budget: number
  needs: Needs
}
