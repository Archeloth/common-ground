import type { NeedId, NeighborhoodSimState } from './types'
import { NEED_ORDER } from './needs'
import { loadScenario } from './scenario'
import { loadProjects } from './projects'
import { loadTechnologies } from './technologies'
import { loadMilestones } from './milestones'

// Runtime validation of a GameState. Used when loading saved games (a broken
// save must show a friendly message, never crash) and by the invariant tests.
// Pure and Node-testable: returns a list of human-readable problems, and an
// empty array means the state is healthy.

export function validateGameState(state: unknown): string[] {
  const problems: string[] = []
  if (state === null || typeof state !== 'object') {
    return ['state must be an object']
  }
  const s = state as Record<string, unknown>

  checkNumber(s.budget, 'budget', 0, Infinity, problems)
  checkNumber(s.time, 'time', 0, Infinity, problems)
  checkNumber(s.knowledge, 'knowledge', 0, Infinity, problems)
  if (!Number.isInteger(s.day) || (s.day as number) < 1) {
    problems.push('day must be an integer >= 1')
  }
  if (![0, 1, 2, 4].includes(s.speed as number)) {
    problems.push('speed must be 0, 1, 2 or 4')
  }

  const scenario = loadScenario()
  const projects = loadProjects()

  if (s.projects === null || typeof s.projects !== 'object') {
    problems.push('projects must be an object')
  } else {
    const projectsRecord = s.projects as Record<string, unknown>
    for (const n of scenario.neighborhoods) {
      const slots = projectsRecord[n.id]
      if (!Array.isArray(slots) || slots.length !== n.slots) {
        problems.push(`projects.${n.id} must have ${n.slots} slots`)
        continue
      }
      slots.forEach((entry, index) => {
        if (entry === null) return
        if (typeof entry !== 'string') {
          problems.push(`projects.${n.id}[${index}] must be a project id or null`)
          return
        }
        if (!projects.some((p) => p.id === entry)) {
          problems.push(`projects.${n.id}[${index}] references unknown project "${entry}"`)
        }
      })
    }
  }

  if (s.neighborhoods === null || typeof s.neighborhoods !== 'object') {
    problems.push('neighborhoods must be an object')
  } else {
    const records = s.neighborhoods as Record<string, unknown>
    for (const n of scenario.neighborhoods) {
      const sim = records[n.id] as Partial<NeighborhoodSimState> | undefined
      if (sim === null || typeof sim !== 'object') {
        problems.push(`neighborhoods.${n.id} must be an object`)
        continue
      }
      if (sim.needs === null || typeof sim.needs !== 'object') {
        problems.push(`neighborhoods.${n.id}.needs must be an object`)
      } else {
        const needs = sim.needs as unknown as Record<string, unknown>
        for (const need of NEED_ORDER) {
          checkNumber(needs[need], `neighborhoods.${n.id}.needs.${need}`, 0, 1, problems)
        }
      }
      checkNumber(sim.satisfaction, `neighborhoods.${n.id}.satisfaction`, 0, 100, problems)
      if (!Array.isArray(sim.reasons) || sim.reasons.length > 3) {
        problems.push(`neighborhoods.${n.id}.reasons must be an array of at most 3 entries`)
      } else {
        sim.reasons.forEach((entry, index) => {
          if (entry === null || typeof entry !== 'object') {
            problems.push(`neighborhoods.${n.id}.reasons[${index}] must be an object`)
            return
          }
          const reason = entry as unknown as Record<string, unknown>
          if (typeof reason.need !== 'string' || !NEED_ORDER.includes(reason.need as NeedId)) {
            problems.push(`neighborhoods.${n.id}.reasons[${index}].need is not a valid need`)
          }
          checkNumber(reason.coverage, `neighborhoods.${n.id}.reasons[${index}].coverage`, 0, 1, problems)
        })
      }
    }
  }

  // Milestone 6 collections: research ids, completed milestones and pending
  // notices must all reference content that actually exists.
  const techIds = new Set(loadTechnologies().map((t) => t.id))
  const milestoneIds = new Set(loadMilestones().map((m) => m.id))
  checkIdList(s.research, 'research', techIds, problems)
  checkIdList(s.milestones, 'milestones', milestoneIds, problems)
  checkIdList(s.milestoneNotices, 'milestoneNotices', milestoneIds, problems)

  // Milestone 7 collections: dynamic engagement, bus links and messages.
  if (s.engagement === null || typeof s.engagement !== 'object') {
    problems.push('engagement must be an object')
  } else {
    const engagement = s.engagement as Record<string, unknown>
    for (const n of scenario.neighborhoods) {
      checkNumber(engagement[n.id], `engagement.${n.id}`, 0, 100, problems)
    }
  }

  if (!Array.isArray(s.busLines)) {
    problems.push('busLines must be an array of neighborhood pairs')
  } else {
    s.busLines.forEach((entry, index) => {
      if (!Array.isArray(entry) || entry.length !== 2 || typeof entry[0] !== 'string' || typeof entry[1] !== 'string') {
        problems.push(`busLines[${index}] must be a pair of neighborhood ids`)
        return
      }
      const [a, b] = entry
      const fromDef = scenario.neighborhoods.find((n) => n.id === a)
      const toDef = scenario.neighborhoods.find((n) => n.id === b)
      if (!fromDef || !toDef) {
        problems.push(`busLines[${index}] references an unknown neighborhood`)
        return
      }
      if (fromDef === toDef || !fromDef.neighbors.includes(b) || !toDef.neighbors.includes(a)) {
        problems.push(`busLines[${index}] must link two adjacent neighborhoods`)
      }
    })
  }

  if (s.messages === null || typeof s.messages !== 'object') {
    problems.push('messages must be an object')
  } else {
    const messages = s.messages as Record<string, unknown>
    for (const n of scenario.neighborhoods) {
      if (messages[n.id] !== 'open' && messages[n.id] !== 'done') {
        problems.push(`messages.${n.id} must be "open" or "done"`)
      }
    }
  }

  // Last line of defence: not a single non-finite number anywhere.
  if (hasNonFinite(state)) problems.push('state contains a non-finite number (NaN or Infinity)')

  return problems
}

function checkIdList(
  value: unknown,
  path: string,
  known: Set<string>,
  problems: string[],
): void {
  if (!Array.isArray(value)) {
    problems.push(`${path} must be an array of content ids`)
    return
  }
  value.forEach((entry, index) => {
    if (typeof entry !== 'string' || !known.has(entry)) {
      problems.push(`${path}[${index}] references an unknown id "${String(entry)}"`)
    }
  })
}

function checkNumber(
  value: unknown,
  path: string,
  min: number,
  max: number,
  problems: string[],
): void {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    problems.push(`${path} must be a finite number`)
  } else if (value < min || value > max) {
    problems.push(`${path} must be between ${min} and ${max}`)
  }
}

function hasNonFinite(value: unknown): boolean {
  if (typeof value === 'number') return !Number.isFinite(value)
  if (Array.isArray(value)) return value.some(hasNonFinite)
  if (value !== null && typeof value === 'object') {
    return Object.values(value).some(hasNonFinite)
  }
  return false
}