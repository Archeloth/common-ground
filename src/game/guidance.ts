import type { GameState, NeedId, NeighborhoodDef, ProjectDef } from './types'
import { visibleNeeds } from './satisfaction'
import { loadScenario, neighborhoodById } from './scenario'
import { projectById } from './projects'
import { projectsFor } from './regionContent'
import { LINE_NAMES, transportOf } from './transport'
import { loadMilestones } from './milestones'
import type { MilestoneCondition, MilestoneDef } from './milestones'
import { messageCatalog, messageFulfilled } from './messages'
import { applyCommand } from './state'
import { loadTechnologies, technologyById } from './technologies'
import { currentTutorialStep } from './tutorial'
import { allExpired, countStarted } from './expiry'

// The "what should I do next?" hint (Milestone 8, plan item 2): a pure
// function that reads the open goals and returns the single best next step.
// Priorities:
//  1. the current tutorial step, while the tutorial is running;
//  2. the first unfulfilled condition of the first uncompleted milestone
//     (actionable ones only - specific projects, counts, need averages and
//     slot totals; a plain town-satisfaction target is not a direct step);
//  3. the first open resident message whose request is not met yet;
//  4. the biggest town-wide need gap with a reachable project.
// Suggestions that need a project are only returned when applyCommand would
// accept the start, so the hint never sends the player into a refusal banner.


export interface NextAction {
  kind: 'tutorial' | 'renew' | 'milestone' | 'message' | 'need'
  textKey: string
  params: Record<string, string | number>
  neighborhoodId?: string
  projectId?: string
  needId?: NeedId
}

export function nextAction(state: GameState): NextAction | null {
  const scenario = loadScenario()
  const projects = projectsFor(scenario)

  const step = currentTutorialStep(state)
  if (step) {
    return {
      kind: 'tutorial',
      textKey: `tutorial.${step.id}`,
      params: {},
      neighborhoodId: step.pulse[0],
    }
  }

  // A lapsed volunteer project is the cheapest win: renew it.
  for (const lapsed of allExpired(state, scenario)) {
    const command = { type: 'renewProject', neighborhood: lapsed.neighborhood, slot: lapsed.slot } as const
    if (!applyCommand(state, command).ok) continue
    return {
      kind: 'renew',
      textKey: 'guide.renew',
      params: {
        project: projectById(projects, lapsed.projectId).name,
        neighborhood: neighborhoodById(scenario, lapsed.neighborhood).name,
      },
      neighborhoodId: lapsed.neighborhood,
      projectId: lapsed.projectId,
    }
  }

  for (const def of loadMilestones()) {
    if (state.milestones.includes(def.id)) continue
    for (const condition of def.conditions) {
      const hint = suggestionForCondition(state, scenario, projects, def, condition)
      if (hint) return hint
    }
  }

  for (const def of messageCatalog()) {
    if (state.messages[def.neighborhood] === 'done') continue
    if (messageFulfilled(state, def)) continue
    // Only point at requests the player can act on right now (a request for
    // a project that still needs research waits until it is researched).
    const command = { type: 'startProject', neighborhood: def.neighborhood, project: def.request.project } as const
    if (!applyCommand(state, command).ok) continue
    const neighborhood = neighborhoodById(scenario, def.neighborhood)
    return {
      kind: 'message',
      textKey: 'guide.message',
      params: {
        neighborhood: neighborhood.name,
        project: projectById(projects, def.request.project).name,
      },
      neighborhoodId: def.neighborhood,
      projectId: def.request.project,
    }
  }

  return biggestNeedGap(state, scenario, projects)
}

function suggestionForCondition(
  state: GameState,
  scenario: ReturnType<typeof loadScenario>,
  projects: readonly ProjectDef[],
  def: MilestoneDef,
  condition: MilestoneCondition,
): NextAction | null {
  switch (condition.type) {
    case 'projectIn': {
      // Already started (even if still being built): nothing to suggest.
      if ((state.projects[condition.neighborhood] ?? []).includes(condition.project)) return null
      const research = researchFirst(state, projects, def, condition.project)
      if (research !== undefined) return research
      const neighborhood = neighborhoodById(scenario, condition.neighborhood)
      return {
        kind: 'milestone',
        textKey: 'guide.milestone',
        params: {
          goal: def.name,
          project: projectById(projects, condition.project).name,
          neighborhood: neighborhood.name,
        },
        neighborhoodId: condition.neighborhood,
        projectId: condition.project,
      }
    }
    case 'projectCount': {
      const total = countStarted(state, condition.project)
      if (total >= condition.min) return null
      const research = researchFirst(state, projects, def, condition.project)
      if (research !== undefined) return research
      const where = scenario.neighborhoods.find((n) =>
        applyCommand(state, { type: 'startProject', neighborhood: n.id, project: condition.project }).ok,
      )
      if (!where) return null
      return {
        kind: 'milestone',
        textKey: 'guide.milestoneCount',
        params: {
          goal: def.name,
          project: projectById(projects, condition.project).name,
          remaining: condition.min - total,
        },
        neighborhoodId: where.id,
        projectId: condition.project,
      }
    }
    case 'slotsFilled': {
      const total = countStarted(state)
      if (total >= condition.min) return null
      const start = firstReachableStart(state, scenario, projects)
      if (!start) return null
      return {
        kind: 'milestone',
        textKey: 'guide.slots',
        params: { goal: def.name, remaining: condition.min - total },
        neighborhoodId: start.neighborhood.id,
        projectId: start.project.id,
      }
    }
    case 'needsAverage': {
      let sum = 0
      for (const n of scenario.neighborhoods) {
        sum += state.neighborhoods[n.id]?.needs[condition.need] ?? 0
      }
      if (sum / scenario.neighborhoods.length >= condition.min) return null
      const lowest = lowestCoverage(state, scenario, condition.need)
      const project = projects.find(
        (p) =>
          p.effects.some((e) => e.need === condition.need) &&
          applyCommand(state, { type: 'startProject', neighborhood: lowest.id, project: p.id }).ok,
      )
      if (!project) return null
      return {
        kind: 'milestone',
        textKey: 'guide.milestoneNeed',
        params: { goal: def.name },
        needId: condition.need,
        neighborhoodId: lowest.id,
        projectId: project.id,
      }
    }
    case 'busLineCount': {
      if (state.busLines.length >= condition.min) return null
      const transport = transportOf(scenario)
      if (!state.research.includes(transport.requiresTech)) {
        return researchHint(state, def, transport.requiresTech, LINE_NAMES[transport.mode])
      }
      for (const n of scenario.neighborhoods) {
        for (const other of n.neighbors) {
          if (applyCommand(state, { type: 'startBusLine', from: n.id, to: other }).ok) {
            return {
              kind: 'milestone',
              textKey: `transport.${transport.mode}.guide`,
              params: { goal: def.name, from: n.name, to: neighborhoodById(scenario, other).name },
              neighborhoodId: n.id,
            }
          }
        }
      }
      return null
    }
    case 'townSatisfaction':
      // Not directly actionable as a single next step; other conditions guide.
      return null
  }
}

// When a goal's project still needs research: a hint to research it (when
// affordable now) or null (nothing to do yet). undefined = no research needed.
function researchFirst(
  state: GameState,
  projects: readonly ProjectDef[],
  def: MilestoneDef,
  projectId: string,
): NextAction | null | undefined {
  const project = projectById(projects, projectId)
  if (!project.requiresTech || state.research.includes(project.requiresTech)) return undefined
  return researchHint(state, def, project.requiresTech, project.name, projectId)
}

// The first technology on the way to `techId` whose prerequisites are all
// researched (so "Rain gardens" points at "Urban trees" first).
function nextTechToward(state: GameState, techId: string): string {
  const techs = loadTechnologies()
  let id = techId
  for (let guard = 0; guard < techs.length; guard++) {
    const missing = technologyById(techs, id).prerequisites.find((pre) => !state.research.includes(pre))
    if (!missing) return id
    id = missing
  }
  return id
}

// Research the next step toward a goal's technology, or earn the Knowledge
// for it first. `thing` names what the research unlocks for the player.
function researchHint(
  state: GameState,
  def: MilestoneDef,
  goalTech: string,
  thing: string,
  projectId?: string,
): NextAction | null {
  const techs = loadTechnologies()
  const next = nextTechToward(state, goalTech)
  if (!applyCommand(state, { type: 'research', tech: next }).ok) {
    // Not enough Knowledge yet: point at the town's way of earning it.
    return knowledgeHint(state, def, technologyById(techs, next).name)
  }
  return {
    kind: 'milestone',
    textKey: next === goalTech ? 'guide.research' : 'guide.researchStep',
    params: {
      goal: def.name,
      tech: technologyById(techs, next).name,
      target: technologyById(techs, goalTech).name,
      project: thing,
    },
    projectId,
  }
}

// A goal needs research the town cannot afford yet: suggest a workshop series
// (or researching Community learning first), or nothing if neither is possible.
function knowledgeHint(state: GameState, def: MilestoneDef, techName: string): NextAction | null {
  const scenario = loadScenario()
  if (!state.research.includes('community_learning')) {
    if (!applyCommand(state, { type: 'research', tech: 'community_learning' }).ok) return null
    return { kind: 'milestone', textKey: 'guide.learnFirst', params: { goal: def.name, tech: techName } }
  }
  const where = scenario.neighborhoods.find(
    (n) => applyCommand(state, { type: 'startProject', neighborhood: n.id, project: 'workshop_series' }).ok,
  )
  if (!where) return null
  return {
    kind: 'milestone',
    textKey: 'guide.needKnowledge',
    params: { goal: def.name, tech: techName, neighborhood: where.name },
    neighborhoodId: where.id,
    projectId: 'workshop_series',
  }
}

// The first start (any project, any neighbourhood) applyCommand accepts, or
// null when nothing is affordable or placeable right now.
function firstReachableStart(
  state: GameState,
  scenario: ReturnType<typeof loadScenario>,
  projects: readonly ProjectDef[],
): { neighborhood: NeighborhoodDef; project: ProjectDef } | null {
  for (const n of scenario.neighborhoods) {
    for (const p of projects) {
      if (applyCommand(state, { type: 'startProject', neighborhood: n.id, project: p.id }).ok) {
        return { neighborhood: n, project: p }
      }
    }
  }
  return null
}

// The neighbourhood with the lowest coverage of a need (first one on ties, so
// suggestions stay deterministic).
function lowestCoverage(
  state: GameState,
  scenario: ReturnType<typeof loadScenario>,
  need: NeedId,
): NeighborhoodDef {
  return scenario.neighborhoods.reduce((a, b) =>
    (state.neighborhoods[a.id]?.needs[need] ?? 0) <= (state.neighborhoods[b.id]?.needs[need] ?? 0) ? a : b,
  )
}

// Last resort: the need with the biggest town-wide gap that still has a
// reachable project in the neighbourhood where it hurts most.
function biggestNeedGap(
  state: GameState,
  scenario: ReturnType<typeof loadScenario>,
  projects: readonly ProjectDef[],
): NextAction | null {
  let best: { gap: number; neighborhoodId: string; projectId: string; needId: NeedId } | null = null
  for (const needId of visibleNeeds(scenario)) {
    const lowest = lowestCoverage(state, scenario, needId)
    const coverage = state.neighborhoods[lowest.id]?.needs[needId] ?? 0
    const gap = 1 - coverage
    const project = projects.find(
      (p) =>
        p.effects.some((e) => e.need === needId) &&
        applyCommand(state, { type: 'startProject', neighborhood: lowest.id, project: p.id }).ok,
    )
    if (project && (!best || gap > best.gap)) {
      best = { gap, neighborhoodId: lowest.id, projectId: project.id, needId }
    }
  }
  if (!best) return null
  return {
    kind: 'need',
    textKey: 'guide.need',
    params: {
      neighborhood: neighborhoodById(scenario, best.neighborhoodId).name,
      project: projectById(projects, best.projectId).name,
    },
    needId: best.needId,
    neighborhoodId: best.neighborhoodId,
    projectId: best.projectId,
  }
}