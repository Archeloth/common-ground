// One place for every visible string, from day one (coding standard 11).
// t("key", { params }) so contributors can translate the game later without
// touching components. Content strings (kind names, descriptions) live in the
// data files instead — content is data.

const MESSAGES: Record<string, string> = {
  'app.title': 'Common Ground',
  'app.status': 'Willowbrook · Milestone 4',
  'app.help': 'Drag to pan · scroll to zoom · click a neighborhood',
  'chip.subtitle': '{kind} · {residents} residents',
  'panel.close': 'Close panel',
  'panel.residents': 'Residents',
  'panel.engagement': 'Engagement',
  'panel.slots': 'Project slots',
  'panel.satisfaction': 'Satisfaction',
  'panel.needs': 'What needs attention here',
  'panel.nearby': 'Nearby',
  'panel.bridgeTo': 'bridge',
  'need.energy': 'Energy',
  'need.food': 'Food',
  'need.mobility': 'Mobility',
  'need.green': 'Green space',
  'need.waste': 'Waste',
  'need.housing': 'Housing comfort',
  'resources.budget': 'Budget',
  'resources.time': 'Community time',
  'resources.knowledge': 'Knowledge',
  'resource.month': 'mo',
  'topbar.month': 'Month {month}',
  'topbar.day': 'Day {day}',
  'topbar.speedLabel': 'Simulation speed',
  'topbar.pause': 'Pause',
  'reason.invalid_speed': 'That is not a valid speed.',
  'reason.dismiss': 'Dismiss',
  'panel.projects': 'Projects',
  'panel.noProjects': 'No projects running in this neighbourhood yet.',
  'panel.freeSlots': '{count} slot(s) free',
  'panel.allSlotsFull': 'All project slots are filled.',
  'project.start': 'Start',
  'project.remove': 'Remove',
  'project.cost': '{value} budget',
  'project.months': '{value} mo',
  'project.needBudget': 'Needs {value} more budget',
  'project.needTime': 'Needs {value} more months',
  'reason.unknown_neighborhood': 'That neighbourhood does not exist.',
  'reason.unknown_project': 'That project does not exist.',
  'reason.project_already_active': 'This project is already running in this neighbourhood.',
  'reason.no_free_slot': 'There is no free project slot in this neighbourhood.',
  'reason.not_allowed_in_kind': 'This project cannot be built in this kind of neighbourhood.',
  'reason.insufficient_budget': 'Not enough budget remaining.',
  'reason.insufficient_time': 'Not enough community time remaining.',
  'reason.invalid_slot': 'That slot is invalid.',
  'reason.empty_slot': 'There is no project running in that slot.',
  'panel.reasons': 'What is holding satisfaction back',
  'panel.reasonsEmpty': 'No significant shortfalls right now.',
  'reason.gap': '{need} coverage is {pct}%',
}

export function t(key: string, params?: Record<string, string | number>): string {
  let text = MESSAGES[key] ?? key
  if (params) {
    for (const [name, value] of Object.entries(params)) {
      text = text.replaceAll(`{${name}}`, String(value))
    }
  }
  return text
}
