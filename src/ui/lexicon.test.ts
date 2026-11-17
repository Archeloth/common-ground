import { describe, expect, it } from 'vitest'
import { LEXICON_ENTRIES, LEXICON_READ_MORE } from './lexiconEntries'
import { readMoreProblems } from '../game/readMore'
import { t } from './i18n'

describe('lexicon content', () => {
  it('has a title and a body for every entry (t() falls back to the key)', () => {
    for (const id of LEXICON_ENTRIES) {
      expect(t(`lexicon.${id}.title`), id).not.toBe(`lexicon.${id}.title`)
      expect(t(`lexicon.${id}.body`), id).not.toBe(`lexicon.${id}.body`)
    }
  })

  it('opens on the welcome entry and never mentions the old "Community time" name', () => {
    expect(LEXICON_ENTRIES[0]).toBe('welcome')
    for (const id of LEXICON_ENTRIES) {
      expect(t(`lexicon.${id}.body`).toLowerCase()).not.toContain('community time')
    }
  })

  it('has valid Read more links for real-world topics only', () => {
    for (const [id, links] of Object.entries(LEXICON_READ_MORE)) {
      expect(LEXICON_ENTRIES as readonly string[]).toContain(id)
      expect(readMoreProblems(links), id).toEqual([])
    }
    expect(LEXICON_READ_MORE.budget).toBeUndefined()
  })
})
