import type { ProjectDef, ScenarioDef } from './types'
import type { TechDef } from './technologies'
import { loadTechnologies } from './technologies'
import { loadProjects } from './projects'
import { transportOf } from './transport'

// Which research and projects a town has (Milestone 10). Catalog entries list
// their regions, or none for "every region"; a town takes those that fit its
// theme, minus any it excludes. The shared core (gardens, compost, repair
// cafés, participatory budgeting) stays untagged.

export function fitsRegion(entry: { regions?: readonly string[] }, theme: string): boolean {
  return entry.regions === undefined || entry.regions.includes(theme)
}

const trees = new WeakMap<ScenarioDef, TechDef[]>()
const catalogs = new WeakMap<ScenarioDef, ProjectDef[]>()

export function techTreeFor(scenario: ScenarioDef): TechDef[] {
  let tree = trees.get(scenario)
  if (!tree) {
    const excluded = new Set(scenario.research?.exclude ?? [])
    tree = loadTechnologies().filter((t) => fitsRegion(t, scenario.theme) && !excluded.has(t.id))
    trees.set(scenario, tree)
  }
  return tree
}

export function projectsFor(scenario: ScenarioDef): ProjectDef[] {
  let projects = catalogs.get(scenario)
  if (!projects) {
    const excluded = new Set(scenario.research?.exclude ?? [])
    projects = loadProjects().filter((p) => fitsRegion(p, scenario.theme) && !excluded.has(p.id))
    catalogs.set(scenario, projects)
  }
  return projects
}

// Problems with a town's research tree and project list: everything in it
// must be reachable, and every district keeps at least two options.
export function regionContentProblems(scenario: ScenarioDef): string[] {
  const problems: string[] = []
  const tree = techTreeFor(scenario)
  const techIds = new Set(tree.map((t) => t.id))
  const known = new Set([...loadTechnologies().map((t) => t.id), ...loadProjects().map((p) => p.id)])
  for (const id of scenario.research?.exclude ?? []) {
    if (!known.has(id)) problems.push(`excludes unknown research or project "${id}"`)
  }
  for (const tech of tree) {
    for (const pre of tech.prerequisites) {
      if (!techIds.has(pre)) problems.push(`technology "${tech.id}" needs "${pre}", which this town does not have`)
    }
  }
  const transport = transportOf(scenario).requiresTech
  if (!techIds.has(transport)) problems.push(`transport needs "${transport}", which this town cannot research`)
  for (const id of scenario.start.unlockedTech) {
    if (!techIds.has(id)) problems.push(`starting technology "${id}" is not in this town's tree`)
  }
  const projects = projectsFor(scenario)
  for (const p of projects) {
    if (p.requiresTech !== undefined && !techIds.has(p.requiresTech)) {
      problems.push(`project "${p.id}" needs "${p.requiresTech}", which this town cannot research`)
    }
  }
  for (const kind of new Set(scenario.neighborhoods.map((n) => n.kind))) {
    if (projects.filter((p) => p.allowedKinds.includes(kind)).length < 2) {
      problems.push(`district kind "${kind}" has fewer than two project options here`)
    }
  }
  return problems
}
