import type { GameState } from './types'
import { activeScenarioId, getScenario, scenarioContent } from './scenario'
import { loadProjects } from './projects'
import { activeProjectIds } from './expiry'

// One resident message per neighborhood (Milestone 7): a simple request — start
// a specific project here — with a small reward (Community time, Budget or
// Knowledge). Requests are content; tick() detects fulfilment and pays the
// reward exactly once.

export interface MessageRequest {
  type: 'projectIn'
  project: string
}

export interface MessageReward {
  budget?: number
  time?: number
  knowledge?: number
}

export interface MessageDef {
  id: string
  neighborhood: string
  text: string
  request: MessageRequest
  reward: MessageReward
}

function fail(what: string): never {
  throw new Error(`Messages data error: ${what}`)
}

interface RawMessage {
  id?: string
  neighborhood?: string
  text?: string
  request?: { project?: string }
  reward?: Record<string, unknown>
}

export function loadMessages(scenarioId = activeScenarioId()): MessageDef[] {
  const raw = scenarioContent(scenarioId).messages as { messages?: RawMessage[] }
  const messages: MessageDef[] = (raw.messages ?? []).map((m, index) => ({
    id: m.id ?? `#${index}`,
    neighborhood: m.neighborhood ?? '',
    text: m.text ?? '',
    request: { type: 'projectIn', project: m.request?.project ?? '' },
    reward: parseReward(m.reward ?? {}),
  }))

  const scenario = getScenario(scenarioId)
  const projectIds = new Set(loadProjects().map((p) => p.id))
  const neighborhoodIds = new Set(scenario.neighborhoods.map((n) => n.id))

  const ids = new Set<string>()
  const seenNeighborhoods = new Set<string>()
  for (const def of messages) {
    if (ids.has(def.id)) fail(`duplicate message id "${def.id}"`)
    ids.add(def.id)
    if (!def.text.trim()) fail(`message "${def.id}" needs a text`)
    if (!neighborhoodIds.has(def.neighborhood)) {
      fail(`message "${def.id}" references unknown neighborhood "${def.neighborhood}"`)
    }
    if (seenNeighborhoods.has(def.neighborhood)) {
      fail(`more than one message for neighborhood "${def.neighborhood}"`)
    }
    seenNeighborhoods.add(def.neighborhood)
    if (def.request.type !== 'projectIn' || !projectIds.has(def.request.project)) {
      fail(`message "${def.id}" references unknown project "${def.request.project}"`)
    }
  }

  // Exactly one message per neighborhood (the plan: "one resident message per
  // neighborhood").
  for (const n of scenario.neighborhoods) {
    if (!seenNeighborhoods.has(n.id)) fail(`no message for neighborhood "${n.id}"`)
  }
  if (messages.length === 0) fail('the catalog lists no messages')
  return messages
}

function parseReward(raw: Record<string, unknown>): MessageReward {
  const reward: MessageReward = {}
  let fields = 0
  for (const key of ['budget', 'time', 'knowledge'] as const) {
    const value = raw[key]
    if (typeof value === 'number') {
      if (!Number.isFinite(value) || value < 0) fail(`reward values must be positive numbers`)
      reward[key] = value
      fields++
    }
  }
  if (fields === 0) fail('a message reward needs at least one resource')
  return reward
}

// Milestone 10: one catalog per town, cached per scenario id.
const cached = new Map<string, MessageDef[]>()

export function messageCatalog(scenarioId = activeScenarioId()): MessageDef[] {
  let messages = cached.get(scenarioId)
  if (!messages) {
    messages = loadMessages(scenarioId)
    cached.set(scenarioId, messages)
  }
  return messages
}

export function messageForNeighborhood(neighborhoodId: string): MessageDef {
  const found = messageCatalog().find((m) => m.neighborhood === neighborhoodId)
  if (!found) fail(`no message for neighborhood "${neighborhoodId}"`)
  return found
}

// The request is fulfilled when the neighbourhood hosts the requested project.
export function messageFulfilled(state: GameState, def: MessageDef): boolean {
  return activeProjectIds(state, def.neighborhood).includes(def.request.project)
}

// Add the (one-off) reward to the state; returns a copy. Callers must only do
// this once (messages status flips to 'done' in the same tick).
export function applyMessageReward(state: GameState, def: MessageDef): GameState {
  return {
    ...state,
    budget: state.budget + (def.reward.budget ?? 0),
    time: state.time + (def.reward.time ?? 0),
    knowledge: state.knowledge + (def.reward.knowledge ?? 0),
  }
}