import type { NeedId, NeighborhoodSimState } from './types'
import { NEED_ORDER } from './needs'
import { getScenario, hasScenario } from './scenario'
import { loadProjects } from './projects'
import { parseExpiryNoticeKey } from './expiry'
import { loadTechnologies } from './technologies'
import { loadMilestones } from './milestones'
import { TUTORIAL_DONE } from './tutorial'
import { HISTORY_MAX_POINTS } from './constants'
import { loadWildlife } from './wildlife'
import { loadStories, parseStoryNoticeKey } from './stories'

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

  // Milestone 10: the town decides everything else (districts, chapters,
  // stories), so an unknown town stops here. Validation never switches the
  // active scenario: it is called for slot metadata while a game runs.
  if (typeof s.scenarioId !== 'string' || !hasScenario(s.scenarioId)) {
    return [`scenarioId names an unknown town "${String(s.scenarioId)}"`]
  }
  const scenario = getScenario(s.scenarioId)

  checkNumber(s.budget, 'budget', 0, Infinity, problems)
  checkNumber(s.time, 'time', 0, Infinity, problems)
  checkNumber(s.knowledge, 'knowledge', 0, Infinity, problems)
  if (!Number.isInteger(s.day) || (s.day as number) < 1) {
    problems.push('day must be an integer >= 1')
  }
  if (![0, 1, 2, 4].includes(s.speed as number)) {
    problems.push('speed must be 0, 1, 2 or 4')
  }

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
  const milestoneIds = new Set(loadMilestones(scenario.id).map((m) => m.id))
  checkIdList(s.research, 'research', techIds, problems)
  checkIdList(s.milestones, 'milestones', milestoneIds, problems)
  checkIdList(s.milestoneNotices, 'milestoneNotices', milestoneIds, problems)

  // Milestone 8.5: per-slot expiry days line up with the projects, and the
  // pending expiry notices are "neighborhood:slot" keys.
  if (s.projectExpiry === null || typeof s.projectExpiry !== 'object') {
    problems.push('projectExpiry must be an object')
  } else {
    const expiry = s.projectExpiry as Record<string, unknown>
    const slotsRecord = (s.projects ?? {}) as Record<string, unknown>
    for (const n of scenario.neighborhoods) {
      const days = expiry[n.id]
      if (!Array.isArray(days) || days.length !== n.slots) {
        problems.push(`projectExpiry.${n.id} must have ${n.slots} entries`)
        continue
      }
      const slots = Array.isArray(slotsRecord[n.id]) ? (slotsRecord[n.id] as unknown[]) : []
      days.forEach((day, index) => {
        if (day === null) return
        if (typeof day !== 'number' || !Number.isInteger(day) || day < 1) {
          problems.push(`projectExpiry.${n.id}[${index}] must be a day number or null`)
        } else if (slots[index] === null || slots[index] === undefined) {
          problems.push(`projectExpiry.${n.id}[${index}] is set for an empty slot`)
        }
      })
    }
  }
  // Construction: ready days line up with projects, like expiry days.
  if (s.projectReady === null || typeof s.projectReady !== 'object') {
    problems.push('projectReady must be an object')
  } else {
    const ready = s.projectReady as Record<string, unknown>
    const slotsRecord = (s.projects ?? {}) as Record<string, unknown>
    for (const n of scenario.neighborhoods) {
      const days = ready[n.id]
      if (!Array.isArray(days) || days.length !== n.slots) {
        problems.push(`projectReady.${n.id} must have ${n.slots} entries`)
        continue
      }
      const slots = Array.isArray(slotsRecord[n.id]) ? (slotsRecord[n.id] as unknown[]) : []
      days.forEach((day, index) => {
        if (day === null) return
        if (typeof day !== 'number' || !Number.isInteger(day) || day < 1) {
          problems.push(`projectReady.${n.id}[${index}] must be a day number or null`)
        } else if (slots[index] === null || slots[index] === undefined) {
          problems.push(`projectReady.${n.id}[${index}] is set for an empty slot`)
        }
      })
    }
  }
  if (!Array.isArray(s.expiryNotices)) {
    problems.push('expiryNotices must be an array')
  } else {
    s.expiryNotices.forEach((key, index) => {
      const parsed = typeof key === 'string' ? parseExpiryNoticeKey(key) : null
      const n = parsed ? scenario.neighborhoods.find((x) => x.id === parsed.neighborhood) : undefined
      if (!parsed || !n || parsed.slot >= n.slots) {
        problems.push(`expiryNotices[${index}] must be a "neighborhood:slot" key`)
      }
    })
  }

  // Town history: an array of monthly points with finite numbers.
  if (!Array.isArray(s.history)) {
    problems.push('history must be an array')
  } else if (s.history.length > HISTORY_MAX_POINTS) {
    problems.push(`history holds at most ${HISTORY_MAX_POINTS} points`)
  } else {
    s.history.forEach((point, index) => {
      const p = point as Record<string, unknown> | null
      if (!p || typeof p !== 'object' || !Number.isInteger(p.day) || typeof p.satisfaction !== 'number' || typeof p.budget !== 'number' || !p.needs || typeof p.needs !== 'object') {
        problems.push(`history[${index}] must be a monthly point`)
      }
    })
  }

  // Town meeting cooldowns: day numbers per district.
  if (s.lastMeeting === null || typeof s.lastMeeting !== 'object' || Array.isArray(s.lastMeeting)) {
    problems.push('lastMeeting must be an object')
  } else {
    for (const [id, day] of Object.entries(s.lastMeeting as Record<string, unknown>)) {
      if (!scenario.neighborhoods.some((n) => n.id === id)) problems.push(`lastMeeting.${id} is not a neighbourhood`)
      else if (typeof day !== 'number' || !Number.isInteger(day) || day < 1) problems.push(`lastMeeting.${id} must be a day number`)
    }
  }

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

  // Milestone 8: the tutorial step is an index into the scripted steps.
  if (
    !Number.isInteger(s.tutorialStep) ||
    (s.tutorialStep as number) < 0 ||
    (s.tutorialStep as number) > TUTORIAL_DONE
  ) {
    problems.push(`tutorialStep must be an integer between 0 and ${TUTORIAL_DONE}`)
  }

  // Post-Milestone 9: the wildlife journal and the citizen stories.
  const species = new Set(loadWildlife().map((sp) => sp.id))
  if (s.wildlife === null || typeof s.wildlife !== 'object' || Array.isArray(s.wildlife)) {
    problems.push('wildlife must be an object')
  } else {
    for (const [id, sighting] of Object.entries(s.wildlife as Record<string, unknown>)) {
      const seen = sighting as { day?: unknown; neighborhood?: unknown } | null
      if (!species.has(id)) problems.push(`wildlife.${id} is not a known species`)
      else if (
        !seen ||
        typeof seen !== 'object' ||
        !Number.isInteger(seen.day) ||
        (seen.day as number) < 1 ||
        !scenario.neighborhoods.some((n) => n.id === seen.neighborhood)
      ) {
        problems.push(`wildlife.${id} must be a sighting { day, neighborhood }`)
      }
    }
  }
  checkIdList(s.wildlifeNotices, 'wildlifeNotices', species, problems)

  const residents = loadStories(scenario)
  if (s.stories === null || typeof s.stories !== 'object' || Array.isArray(s.stories)) {
    problems.push('stories must be an object')
  } else {
    for (const [id, reached] of Object.entries(s.stories as Record<string, unknown>)) {
      const resident = residents.find((r) => r.id === id)
      if (!resident) problems.push(`stories.${id} is not a known resident`)
      else if (!Number.isInteger(reached) || (reached as number) < 0 || (reached as number) > resident.chapters.length) {
        problems.push(`stories.${id} must be a chapter count`)
      }
    }
  }
  if (!Array.isArray(s.storyNotices)) {
    problems.push('storyNotices must be an array')
  } else {
    s.storyNotices.forEach((key, index) => {
      const parsed = typeof key === 'string' ? parseStoryNoticeKey(key) : null
      const resident = parsed ? residents.find((r) => r.id === parsed.resident) : undefined
      if (!parsed || !resident || parsed.chapter >= resident.chapters.length) {
        problems.push(`storyNotices[${index}] must be a "resident:chapter" key`)
      }
    })
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