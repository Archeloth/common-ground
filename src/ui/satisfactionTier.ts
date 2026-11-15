// A word and a colour class for a satisfaction value (Milestone 8.5: town and
// hover stats). The word is always shown next to the colour, so the cue never
// relies on colour alone (plan accessibility notes).
export type SatisfactionTier = 'low' | 'fair' | 'good'

export function satisfactionTier(value: number): SatisfactionTier {
  if (value < 45) return 'low'
  if (value < 60) return 'fair'
  return 'good'
}
