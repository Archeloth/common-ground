import { afterEach, describe, expect, it } from 'vitest'
import { SEASON_SETS } from '../../game/calendar'
import { listScenarios } from '../../game/scenario'
import { COLORS, KIND_COLORS } from './colors'
import { PALETTE, ROOFS, WALLS } from './sprites/kit'
import { RECIPES } from './scene/layout'
import { SEASON_LOOKS } from './scene/season'
import type { RegionTheme } from './theme'
import { TEMPERATE, THEMES, applyTheme, currentTheme, hasTheme } from './theme'

// Milestone 10: a town's look comes from its RegionTheme. Every town's theme
// must exist and cover what the town uses (step 10.0 item 2's check), and
// wearing a theme must be fully reversible.

afterEach(() => applyTheme(TEMPERATE))

describe('every town has a complete theme', () => {
  it.each(listScenarios().map((s) => [s.id, s] as const))('%s', (_id, town) => {
    expect(hasTheme(town.theme), `theme "${town.theme}"`).toBe(true)
    const theme = THEMES[town.theme]
    for (const n of town.neighborhoods) {
      expect(theme.kindColors[n.kind], `colour for ${n.kind}`).toMatch(/^#[0-9a-f]{6}$/i)
      expect(theme.recipes[n.kind], `recipe for ${n.kind}`).toBeDefined()
    }
    for (const season of SEASON_SETS[town.seasons ?? 'temperate']) {
      expect(theme.seasonLooks[season.id], `look for ${season.id}`).toBeDefined()
    }
  })
})

describe('wearing a theme', () => {
  const desert: RegionTheme = {
    ...TEMPERATE,
    id: 'test_desert',
    palette: { wallCream: '#e8c99a', leaf: '#8a9a4a' },
    colors: { ground: '#e3cfa2' },
    kindColors: { old_town: '#c8955c' },
    recipes: { old_town: TEMPERATE.recipes.old_town },
    accent: { primary: '#8a5a2b', strong: '#6f4720', soft: '#f1e2c8' },
  }

  it('starts temperate and leaves it unchanged until another theme is worn', () => {
    expect(currentTheme()).toBe(TEMPERATE)
    expect(KIND_COLORS).toEqual(TEMPERATE.kindColors)
    expect(RECIPES).toEqual(TEMPERATE.recipes)
  })

  it('fills the live tables from the theme, and the swatches follow the palette', () => {
    applyTheme(desert)
    expect(PALETTE.wallCream).toBe('#e8c99a')
    expect(WALLS[0]).toBe('#e8c99a')
    expect(COLORS.ground).toBe('#e3cfa2')
    expect(COLORS.river).toBe(TEMPERATE.colors.river ?? '#7fa3c4') // not overridden: the base stays
    expect(KIND_COLORS).toEqual({ old_town: '#c8955c' })
    expect(Object.keys(RECIPES)).toEqual(['old_town'])
  })

  it('round-trips back to the temperate look exactly', () => {
    const palette = { ...PALETTE }
    const colors = { ...COLORS }
    const walls = [...WALLS]
    const roofs = [...ROOFS]
    applyTheme(desert)
    applyTheme(TEMPERATE)
    expect({ ...PALETTE }).toEqual(palette)
    expect({ ...COLORS }).toEqual(colors)
    expect(WALLS).toEqual(walls)
    expect(ROOFS).toEqual(roofs)
    expect(KIND_COLORS).toEqual(TEMPERATE.kindColors)
    expect(RECIPES).toEqual(TEMPERATE.recipes)
    expect(SEASON_LOOKS).toEqual(TEMPERATE.seasonLooks)
  })
})
