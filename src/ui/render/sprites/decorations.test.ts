import { describe, expect, it } from 'vitest'
import { loadProjects } from '../../../game/projects'
import { DECORATIONS, VISUAL_IDS } from './decorations'

describe('project visuals', () => {
  it('gives every project a little scene the map knows how to draw', () => {
    for (const p of loadProjects()) expect(VISUAL_IDS, p.id).toContain(p.visual)
  })

  it('has a drawing for every visual id', () => {
    for (const id of VISUAL_IDS) expect(typeof DECORATIONS[id], id).toBe('function')
  })

  it('uses each visual for one project only (each looks different on the map)', () => {
    const visuals = loadProjects().map((p) => p.visual)
    expect(new Set(visuals).size).toBe(visuals.length)
  })
})
