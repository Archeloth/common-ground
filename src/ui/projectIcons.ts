// A friendly emoji per project scene (Milestone 9), used in the picker, the
// slot list and the research cards. Keyed by the project's `visual`, so a new
// project only needs a new entry here (a test checks every visual has one).
export const PROJECT_ICONS: Record<string, string> = {
  garden: '🥕',
  solar: '☀️',
  retrofit: '🏡',
  heatPump: '♨️',
  energyCoop: '🌬️',
  compost: '🍂',
  market: '🧺',
  safeStreets: '🚲',
  bikeShare: '🚴',
  repairCafe: '🔧',
  recycling: '♻️',
  meadow: '🌼',
  streetTrees: '🌳',
  rainGarden: '💧',
  workshop: '💡',
}

export function projectIcon(visual: string): string {
  return PROJECT_ICONS[visual] ?? '✨'
}
