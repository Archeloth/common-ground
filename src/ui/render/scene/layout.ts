import type { NeighborhoodDef, NeighborhoodKind } from '../../../game/types'
import type { Point } from '../../../game/geometry'
import { pointInPolygon } from '../../../game/geometry'
import { BLOB_Y_SQUASH } from '../../../game/blob'
import { districtOutline } from '../../../game/outline'
import { activeScenarioId, loadScenario } from '../../../game/scenario'
import { mulberry32 } from '../../../game/random'

// Where things stand inside a neighbourhood (Milestone 9 art). Pure and
// deterministic: the same seed always gives the same little town, so the map
// never reshuffles and the layout is unit-tested in Node. Coordinates are in
// world units; a plot's (x, y) is the point where a sprite touches the ground.

export type BuildingStyle =
  | 'terrace' | 'block' | 'house' | 'shed' | 'store' | 'barn'
  // Milestone 10 regions
  | 'mudhouse' | 'ksarTower' | 'tent'
  | 'minka' | 'tiledHouse' | 'kura'
export type GreeneryStyle =
  | 'tree' | 'conifer' | 'reeds' | 'field'
  | 'palm' | 'acacia' | 'millet'
  | 'pine' | 'cherry' | 'bamboo' | 'paddy'

export interface Plot {
  x: number
  y: number
  size: number // footprint radius in world units
  variant: number // 0..1, picks colours and small shape differences
}

export interface Building extends Plot {
  style: BuildingStyle
}

export interface Greenery extends Plot {
  style: GreeneryStyle
}

export interface SceneLayout {
  buildings: Building[]
  greenery: Greenery[]
  slots: Plot[] // one per project slot, in slot order
  cars: Plot[] // parked cars; how many show depends on mobility
}

export interface KindRecipe {
  buildings: Array<{ style: BuildingStyle; count: number; size: number }>
  greenery: Array<{ style: GreeneryStyle; count: number; size: number }>
  cars: number
}

// Each kind's look: what it is built from (plan: "the kind sets ... the sprite set").
// The live table: these temperate recipes, replaced in place by the town's
// RegionTheme (Milestone 10).
export const RECIPES: Partial<Record<NeighborhoodKind, KindRecipe>> = {
  old_town: { buildings: [{ style: 'terrace', count: 7, size: 9 }], greenery: [{ style: 'tree', count: 2, size: 6 }], cars: 3 },
  apartments: { buildings: [{ style: 'block', count: 4, size: 12 }], greenery: [{ style: 'tree', count: 3, size: 6 }], cars: 4 },
  suburb: { buildings: [{ style: 'house', count: 7, size: 8 }], greenery: [{ style: 'tree', count: 4, size: 6 }], cars: 5 },
  riverside: {
    buildings: [{ style: 'house', count: 5, size: 8 }],
    greenery: [
      { style: 'reeds', count: 4, size: 5 },
      { style: 'tree', count: 2, size: 6 },
    ],
    cars: 2,
  },
  industrial_edge: { buildings: [{ style: 'shed', count: 3, size: 13 }], greenery: [{ style: 'tree', count: 1, size: 6 }], cars: 3 },
  retail_park: { buildings: [{ style: 'store', count: 2, size: 15 }], greenery: [{ style: 'tree', count: 2, size: 6 }], cars: 7 },
  farmland: {
    buildings: [{ style: 'barn', count: 1, size: 11 }],
    greenery: [
      { style: 'field', count: 3, size: 13 },
      { style: 'tree', count: 2, size: 6 },
    ],
    cars: 1,
  },
  woodland: {
    buildings: [],
    greenery: [
      { style: 'conifer', count: 8, size: 6 },
      { style: 'tree', count: 7, size: 6 },
    ],
    cars: 0,
  },
}

const SLOT_SIZE = 10
const CAR_SIZE = 3.5
// Sprites rise above their ground point, so keep plots off the blob's top rim.
const SHRINK = 0.74
const TOP_MARGIN = 0.18 // fraction of the radius kept clear at the top

// Distance in the squashed ellipse metric (so "far apart" looks right on screen).
function apart(a: Plot, b: Plot, gap: number): boolean {
  const dx = a.x - b.x
  const dy = (a.y - b.y) / BLOB_Y_SQUASH
  return Math.hypot(dx, dy) >= a.size + b.size + gap
}

// `outline` is the district's shape on the map (see game/outline.ts).
export function sceneLayout(n: NeighborhoodDef, outline: readonly Point[] = districtOutline(loadScenario(), n.id)): SceneLayout {
  const { x: cx, y: cy, radius: r, seed } = n.shape
  const inner: Point[] = outline.map((p) => ({
    x: cx + (p.x - cx) * SHRINK,
    y: cy + (p.y - cy) * SHRINK,
  }))
  const rand = mulberry32((seed ^ 0x5eed) >>> 0)
  const placed: Plot[] = []

  const place = (size: number, gap: number, attempts = 300): Plot | null => {
    for (let i = 0; i < attempts; i++) {
      const x = cx + (rand() * 2 - 1) * r * SHRINK
      const y = cy + (rand() * 2 - 1) * r * SHRINK * BLOB_Y_SQUASH
      if (y < cy - r * BLOB_Y_SQUASH * (SHRINK - TOP_MARGIN)) continue
      if (!pointInPolygon(inner, x, y)) continue
      const plot: Plot = { x, y, size, variant: rand() }
      if (placed.every((other) => apart(plot, other, gap))) {
        placed.push(plot)
        return plot
      }
    }
    return null
  }

  // Project slots first, so every slot always has a home; if the blob is
  // crowded, relax the spacing rather than drop a slot.
  const slots: Plot[] = []
  for (let i = 0; i < n.slots; i++) {
    const plot = place(SLOT_SIZE, 3) ?? place(SLOT_SIZE * 0.8, 0, 600) ?? place(SLOT_SIZE * 0.6, -4, 1000)
    slots.push(plot ?? { x: cx, y: cy, size: SLOT_SIZE * 0.6, variant: 0.5 })
  }

  const recipe = RECIPES[n.kind]
  if (!recipe) throw new Error(`No layout recipe for district kind "${n.kind}" in this theme`)
  const buildings: Building[] = []
  for (const spec of recipe.buildings) {
    for (let i = 0; i < spec.count; i++) {
      const plot = place(spec.size, 1.5)
      if (plot) buildings.push({ ...plot, style: spec.style })
    }
  }
  const greenery: Greenery[] = []
  for (const spec of recipe.greenery) {
    for (let i = 0; i < spec.count; i++) {
      const plot = place(spec.size, 0.5)
      if (plot) greenery.push({ ...plot, style: spec.style })
    }
  }
  const cars: Plot[] = []
  for (let i = 0; i < recipe.cars; i++) {
    const plot = place(CAR_SIZE, 0.5)
    if (plot) cars.push(plot)
  }

  // Back to front, so lower sprites overlap higher ones (plan: y-sorted sprites).
  const byY = <T extends Plot>(a: T, b: T) => a.y - b.y
  return { buildings: buildings.sort(byY), greenery: greenery.sort(byY), slots, cars: cars.sort(byY) }
}

const cache = new Map<string, SceneLayout>()

// Layouts never change during a game; compute each one once.
// Keyed by town and district (Milestone 10), so towns never share a layout.
export function layoutFor(n: NeighborhoodDef): SceneLayout {
  const key = `${activeScenarioId()}/${n.id}`
  let layout = cache.get(key)
  if (!layout) {
    layout = sceneLayout(n)
    cache.set(key, layout)
  }
  return layout
}
