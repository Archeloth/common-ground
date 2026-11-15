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
  'time',
] as const

export type LexiconEntryId = (typeof LEXICON_ENTRIES)[number]
