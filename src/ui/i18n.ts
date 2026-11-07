// One place for every visible string, from day one (coding standard 11).
// t("key", { params }) so contributors can translate the game later without
// touching components. Content strings (kind names, descriptions) live in the
// data files instead — content is data.

const MESSAGES: Record<string, string> = {
  'app.title': 'Common Ground',
  'app.status': 'Willowbrook · Milestone 2',
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
