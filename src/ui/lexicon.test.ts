import { describe, expect, it } from 'vitest'
import { LEXICON_ENTRIES } from './lexiconEntries'
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
})
