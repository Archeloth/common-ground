import { describe, expect, it } from 'vitest'
import { readMoreProblems, wikipedia } from './readMore'
import { loadTechnologies } from './technologies'
import { loadWildlife } from './wildlife'

describe('read more links', () => {
  it('builds Wikipedia article URLs, encoding accents and spaces', () => {
    expect(wikipedia('Heat pump').url).toBe('https://en.wikipedia.org/wiki/Heat_pump')
    expect(wikipedia('Repair Café').url).toBe('https://en.wikipedia.org/wiki/Repair_Caf%C3%A9')
    expect(wikipedia('Stag beetle', 'Lucanus cervus')).toEqual({
      title: 'Stag beetle',
      url: 'https://en.wikipedia.org/wiki/Lucanus_cervus',
    })
  })

  it('accepts only English Wikipedia articles with a title', () => {
    expect(readMoreProblems([wikipedia('Compost')])).toEqual([])
    expect(readMoreProblems([{ title: 'Elsewhere', url: 'https://example.com/compost' }])).toHaveLength(1)
    expect(readMoreProblems([{ title: 'Search', url: 'https://en.wikipedia.org/wiki/Compost?x=1' }])).toHaveLength(1)
    expect(readMoreProblems([{ title: '', url: 'https://en.wikipedia.org/wiki/Compost' }])).toHaveLength(1)
    expect(readMoreProblems('nope')).toHaveLength(1)
  })

  it('gives every technology and every species something to read', () => {
    for (const tech of loadTechnologies()) {
      expect(tech.readMore.length, tech.id).toBeGreaterThan(0)
      expect(readMoreProblems(tech.readMore), tech.id).toEqual([])
    }
    for (const species of loadWildlife()) {
      expect(species.readMore.length, species.id).toBeGreaterThan(0)
      expect(readMoreProblems(species.readMore), species.id).toEqual([])
    }
  })
})
