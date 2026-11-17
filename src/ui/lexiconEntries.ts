import type { ReadMoreLink } from '../game/readMore'
import { wikipedia } from '../game/readMore'

// Entry ids of the in-game lexicon (Milestone 8.5: "a separate panel to read
// about game mechanics first"). Titles and bodies live in i18n as
// lexicon.<id>.title / lexicon.<id>.body.
export const LEXICON_ENTRIES = [
  'welcome',
  'budget',
  'volunteers',
  'knowledge',
  'engagement',
  'needs',
  'satisfaction',
  'projects',
  'lifetimes',
  'research',
  'bus',
  'food',
  'requests',
  'milestones',
  'journal',
  'time',
] as const

export type LexiconEntryId = (typeof LEXICON_ENTRIES)[number]

// Further reading for the topics that exist outside the game (game mechanics
// such as Budget or Satisfaction have none). Checked against the Wikipedia API
// when added; see DECISIONS.md.
export const LEXICON_READ_MORE: Partial<Record<LexiconEntryId, ReadMoreLink[]>> = {
  engagement: [wikipedia('Community engagement'), wikipedia('Public participation')],
  needs: [wikipedia('Sustainable community')],
  research: [wikipedia('Sustainable development')],
  bus: [wikipedia('Public transport')],
  food: [wikipedia('Local food'), wikipedia('Food miles')],
  requests: [wikipedia('Participatory budgeting')],
  journal: [wikipedia('Urban wildlife'), wikipedia('Pollinator decline')],
}
