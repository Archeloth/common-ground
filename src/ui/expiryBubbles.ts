import type { GameState, ScenarioDef } from '../game/types'
import { parseExpiryNoticeKey } from '../game/expiry'
import { loadProjects, projectById } from '../game/projects'
import { applyCommand, projectTimeCost } from '../game/state'
import { neighborhoodById } from '../game/scenario'
import { t } from './i18n'

// One popup bubble on the map per pending expiry notice (Milestone 8.5:
// "popup on the district if it expired"). Pure view data; the map pins each
// bubble above its neighbourhood and the buttons dispatch commands.
export interface ExpiryBubble {
  key: string // "neighborhood:slot", the notice key
  neighborhoodId: string
  slot: number
  text: string
  renewLabel: string
  canRenew: boolean
}

export function expiryBubbles(state: GameState, scenario: ScenarioDef): ExpiryBubble[] {
  const projects = loadProjects()
  const out: ExpiryBubble[] = []
  for (const key of state.expiryNotices) {
    const parsed = parseExpiryNoticeKey(key)
    if (!parsed) continue
    const projectId = state.projects[parsed.neighborhood]?.[parsed.slot]
    if (!projectId) continue
    const neighborhood = neighborhoodById(scenario, parsed.neighborhood)
    const project = projectById(projects, projectId)
    const cost = projectTimeCost(project.time, state.engagement[neighborhood.id] ?? neighborhood.engagement)
    out.push({
      key,
      neighborhoodId: neighborhood.id,
      slot: parsed.slot,
      text: t('expiry.bubble', { project: project.name, neighborhood: neighborhood.name }),
      renewLabel: cost === 1 ? t('project.renewOne') : t('project.renew', { cost }),
      canRenew: applyCommand(state, { type: 'renewProject', neighborhood: neighborhood.id, slot: parsed.slot }).ok,
    })
  }
  return out
}
