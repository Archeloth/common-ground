import type { ScenarioDef } from '../../../game/types'
import type { Point } from '../../../game/geometry'
import { distanceToSegment, pointInPolygon } from '../../../game/geometry'
import { districtOutline, outlineBox } from '../../../game/outline'
import { scenarioBounds } from '../../../game/scenario'
import { mulberry32 } from '../../../game/random'

// The countryside around the town (post-Milestone 9 playtest: "the world
// outside the districts should have something to it"). Pure and seeded, like
// the district layouts: copses of trees, bushes, grass, wild flowers and rocks
// on the open ground, reeds along the river banks and lily pads on the water.
// Nothing grows inside a district or pokes into one, and nothing stands in the
// river. Coordinates are world units; (x, y) is where a sprite meets the ground.

export type WildStyle = 'tree' | 'conifer' | 'bush' | 'tuft' | 'flowers' | 'rock' | 'reeds' | 'lilypad'

export interface WildItem {
  x: number
  y: number
  style: WildStyle
  size: number // footprint radius, world units
  variant: number // 0..1
}

// How far each sprite rises above its ground point (world units, scaled).
export const WILD_HEIGHT: Record<WildStyle, number> = {
  tree: 24,
  conifer: 26,
  bush: 9,
  tuft: 5,
  flowers: 4,
  rock: 4,
  reeds: 11,
  lilypad: 0,
}

const SIZE: Record<WildStyle, number> = {
  tree: 6,
  conifer: 5,
  bush: 4,
  tuft: 2.2,
  flowers: 2.6,
  rock: 3,
  reeds: 4,
  lilypad: 3,
}

const SEED = 0x7a1d5
const MARGIN_X = 620 // countryside beyond the town's bounds
const MARGIN_Y = 420
const CANDIDATES = 11000
const DISTRICT_CLEARANCE = 8 // open ground kept around every district
const BANK = 5 // the drawn bank stroke reaches this far past halfDepth
const BRIDGE_CLEARANCE = 34

function riverDistance(river: readonly Point[], p: Point): number {
  let best = Infinity
  for (let i = 0; i < river.length - 1; i++) best = Math.min(best, distanceToSegment(p, river[i], river[i + 1]))
  return best
}

function distanceToOutline(p: Point, outline: readonly Point[]): number {
  let best = Infinity
  for (let i = 0; i < outline.length - 1; i++) best = Math.min(best, distanceToSegment(p, outline[i], outline[i + 1]))
  return best
}

// A point `along` (0..1) the river's length, and the unit normal there.
export function alongRiver(river: readonly Point[], along: number): { p: Point; normal: Point } {
  const lengths = river.slice(1).map((pt, i) => Math.hypot(pt.x - river[i].x, pt.y - river[i].y))
  const total = lengths.reduce((a, b) => a + b, 0)
  let d = Math.min(1, Math.max(0, along)) * total
  for (let i = 0; i < lengths.length; i++) {
    if (d <= lengths[i] || i === lengths.length - 1) {
      const a = river[i]
      const b = river[i + 1]
      const k = lengths[i] === 0 ? 0 : d / lengths[i]
      const dx = (b.x - a.x) / (lengths[i] || 1)
      const dy = (b.y - a.y) / (lengths[i] || 1)
      return { p: { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k }, normal: { x: -dy, y: dx } }
    }
    d -= lengths[i]
  }
  return { p: river[0], normal: { x: 0, y: 1 } }
}

export function nearBridge(s: ScenarioDef, p: Point, clearance = BRIDGE_CLEARANCE): boolean {
  return s.bridges.some((b) => Math.abs(b.point.x - p.x) < clearance)
}

export function wildsLayout(s: ScenarioDef): WildItem[] {
  const rand = mulberry32(SEED)
  const town = scenarioBounds(s)
  const outlines = s.neighborhoods.map((n) => {
    const points = districtOutline(s, n.id)
    return { points, box: outlineBox(points) }
  })
  const river = s.river.points
  const minX = town.minX - MARGIN_X
  const minY = town.minY - MARGIN_Y
  const width = town.width + MARGIN_X * 2
  const height = town.height + MARGIN_Y * 2

  // Woods and meadows: a smooth seeded field in -1..1.
  const phase = [rand(), rand(), rand()].map((v) => v * Math.PI * 2)
  const woods = (x: number, y: number) =>
    (Math.sin(x * 0.011 + phase[0]) + Math.sin(y * 0.019 + phase[1]) + Math.sin((x + y) * 0.0065 + phase[2])) / 3

  const clearOfDistricts = (x: number, y: number, rise: number): boolean => {
    const reach = DISTRICT_CLEARANCE + 8
    for (const o of outlines) {
      if (x < o.box.minX - reach || x > o.box.maxX + reach) continue
      if (y < o.box.minY - reach || y - rise > o.box.maxY + reach) continue
      for (const p of [
        { x, y },
        { x, y: y - rise },
      ]) {
        if (pointInPolygon(o.points, p.x, p.y)) return false
        if (distanceToOutline(p, o.points) < DISTRICT_CLEARANCE) return false
      }
    }
    return true
  }

  // A coarse grid for spacing checks.
  const CELL = 16
  const grid = new Map<string, WildItem[]>()
  const cellKey = (cx: number, cy: number) => `${cx},${cy}`
  const roomFor = (x: number, y: number, size: number): boolean => {
    const cx = Math.floor(x / CELL)
    const cy = Math.floor(y / CELL)
    for (let i = -2; i <= 2; i++) {
      for (let j = -2; j <= 2; j++) {
        for (const other of grid.get(cellKey(cx + i, cy + j)) ?? []) {
          // Squashed distance, like the district layouts: rows read as depth.
          if (Math.hypot(x - other.x, (y - other.y) / 0.6) < size + other.size + 1.5) return false
        }
      }
    }
    return true
  }
  const items: WildItem[] = []
  const add = (item: WildItem) => {
    items.push(item)
    const key = cellKey(Math.floor(item.x / CELL), Math.floor(item.y / CELL))
    const list = grid.get(key)
    if (list) list.push(item)
    else grid.set(key, [item])
  }

  // Reeds along both banks and lily pads on the water, away from the bridges.
  for (let along = 0.01; along < 0.99; along += 0.012) {
    const { p, normal } = alongRiver(river, along)
    for (const side of [-1, 1]) {
      if (rand() < 0.45) continue
      const off = s.river.halfDepth + BANK - 1 + rand() * 4
      const at = { x: p.x + normal.x * off * side + (rand() - 0.5) * 6, y: p.y + normal.y * off * side }
      if (nearBridge(s, at) || !clearOfDistricts(at.x, at.y, WILD_HEIGHT.reeds)) continue
      if (!roomFor(at.x, at.y, SIZE.reeds)) continue
      add({ x: at.x, y: at.y, style: 'reeds', size: SIZE.reeds, variant: rand() })
    }
    if (rand() < 0.22) {
      const side = rand() < 0.5 ? -1 : 1
      const off = s.river.halfDepth - 8 - rand() * 6
      const at = { x: p.x + normal.x * off * side, y: p.y + normal.y * off * side }
      if (!nearBridge(s, at) && roomFor(at.x, at.y, SIZE.lilypad)) {
        add({ x: at.x, y: at.y, style: 'lilypad', size: SIZE.lilypad, variant: rand() })
      }
    }
  }

  for (let i = 0; i < CANDIDATES; i++) {
    const x = minX + rand() * width
    const y = minY + rand() * height
    const pickRoll = rand()
    const keepRoll = rand()
    const variant = rand()
    // Thinner the further from town, so the edges fade out.
    const out = Math.max(town.minX - x, x - (town.minX + town.width), 0) / MARGIN_X
    const outY = Math.max(town.minY - y, y - (town.minY + town.height), 0) / MARGIN_Y
    const fade = Math.max(0, 1 - Math.max(out, outY))
    const w = woods(x, y)
    let style: WildStyle
    let keep: number
    if (w > 0.32) {
      style = pickRoll < 0.42 ? 'tree' : pickRoll < 0.72 ? 'conifer' : pickRoll < 0.9 ? 'bush' : 'tuft'
      keep = 0.9
    } else if (w > -0.05) {
      style = pickRoll < 0.12 ? 'tree' : pickRoll < 0.38 ? 'bush' : pickRoll < 0.6 ? 'flowers' : 'tuft'
      keep = 0.45
    } else {
      style = pickRoll < 0.08 ? 'bush' : pickRoll < 0.3 ? 'flowers' : pickRoll < 0.38 ? 'rock' : 'tuft'
      keep = 0.22
    }
    if (keepRoll > keep * (0.25 + 0.75 * fade)) continue
    const size = SIZE[style]
    if (riverDistance(river, { x, y }) < s.river.halfDepth + BANK + size + 2) continue
    if (!clearOfDistricts(x, y, WILD_HEIGHT[style])) continue
    if (!roomFor(x, y, size)) continue
    add({ x, y, style, size, variant })
  }

  return items.sort((a, b) => a.y - b.y)
}

// River life: spots where fish leap, and stretches where ducks paddle.
export interface RiverLife {
  fish: Array<{ along: number; side: number; seed: number }>
  ducks: Array<{ along: number; range: number; side: number; seed: number }>
}

export function riverLife(s: ScenarioDef): RiverLife {
  const rand = mulberry32(SEED ^ 0xf15)
  const fish: RiverLife['fish'] = []
  for (let i = 0; i < 7; i++) {
    const along = 0.06 + (i / 7) * 0.88 + rand() * 0.05
    if (nearBridge(s, alongRiver(s.river.points, along).p, 40)) continue
    fish.push({ along, side: rand() * 2 - 1, seed: rand() * 10 })
  }
  // Stretches of open water between the two bridges.
  const ducks: RiverLife['ducks'] = [0.3, 0.52, 0.72].map((along) => ({
    along,
    range: 0.04 + rand() * 0.03,
    side: rand() * 2 - 1,
    seed: rand() * 10,
  }))
  return { fish, ducks }
}

const cache = new WeakMap<ScenarioDef, { items: WildItem[]; life: RiverLife }>()

export function wildsFor(s: ScenarioDef): { items: WildItem[]; life: RiverLife } {
  let entry = cache.get(s)
  if (!entry) {
    entry = { items: wildsLayout(s), life: riverLife(s) }
    cache.set(s, entry)
  }
  return entry
}
