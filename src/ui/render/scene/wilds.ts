import type { ScenarioDef } from '../../../game/types'
import type { Point } from '../../../game/geometry'
import { distanceToSegment, pointInPolygon } from '../../../game/geometry'
import { districtOutline, outlineBox } from '../../../game/outline'
import { scenarioBounds } from '../../../game/scenario'
import { mulberry32 } from '../../../game/random'
import { isPool, nearCrossing, ring, townWaterClearance } from '../../../game/water'
import { themeById } from '../theme'

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

// How far along a polyline (0..1) the point nearest to p lies.
export function alongOf(line: readonly Point[], p: Point): number {
  let walked = 0
  let best = { d: Infinity, at: 0 }
  for (let i = 0; i < line.length - 1; i++) {
    const a = line[i]
    const b = line[i + 1]
    const len = Math.hypot(b.x - a.x, b.y - a.y)
    const k = len === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / (len * len)))
    const d = Math.hypot(a.x + (b.x - a.x) * k - p.x, a.y + (b.y - a.y) * k - p.y)
    if (d < best.d) best = { d, at: walked + len * k }
    walked += len
  }
  return walked === 0 ? 0 : best.at / walked
}

export function wildsLayout(s: ScenarioDef): WildItem[] {
  const rand = mulberry32(SEED)
  const town = scenarioBounds(s)
  const outlines = s.neighborhoods.map((n) => {
    const points = districtOutline(s, n.id)
    return { points, box: outlineBox(points) }
  })
  const minX = town.minX - MARGIN_X
  const minY = town.minY - MARGIN_Y
  const width = town.width + MARGIN_X * 2
  const height = town.height + MARGIN_Y * 2

  // How much grows here is the region's (Milestone 10): sparse at a desert edge.
  const density = themeById(s.theme).wilds.density

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

  // Reeds along the banks and lily pads on open water, away from crossings.
  // A wadi is a dry bed most of the year, so nothing grows in it.
  for (const w of s.water) {
    if (w.kind === 'wadi') continue
    const pool = isPool(w)
    const line = pool ? ring(w.points) : w.points
    const half = pool ? 0 : w.halfDepth
    for (let along = 0.01; along < 0.99; along += 0.012) {
      const { p, normal } = alongRiver(line, along)
      for (const side of [-1, 1]) {
        if (rand() < 0.45) continue
        const off = half + BANK - 1 + rand() * 4
        const at = { x: p.x + normal.x * off * side + (rand() - 0.5) * 6, y: p.y + normal.y * off * side }
        if (pool && pointInPolygon(w.points, at.x, at.y)) continue
        if (nearCrossing(s, at, BRIDGE_CLEARANCE) || !clearOfDistricts(at.x, at.y, WILD_HEIGHT.reeds)) continue
        if (!roomFor(at.x, at.y, SIZE.reeds)) continue
        add({ x: at.x, y: at.y, style: 'reeds', size: SIZE.reeds, variant: rand() })
      }
      if (rand() < 0.22) {
        let side = rand() < 0.5 ? -1 : 1
        const off = pool ? 8 + rand() * 6 : half - 8 - rand() * 6
        if (pool && !pointInPolygon(w.points, p.x + normal.x * off * side, p.y + normal.y * off * side)) side = -side
        const at = { x: p.x + normal.x * off * side, y: p.y + normal.y * off * side }
        if (!nearCrossing(s, at, BRIDGE_CLEARANCE) && roomFor(at.x, at.y, SIZE.lilypad)) {
          add({ x: at.x, y: at.y, style: 'lilypad', size: SIZE.lilypad, variant: rand() })
        }
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
    if (keepRoll > keep * density * (0.25 + 0.75 * fade)) continue
    const size = SIZE[style]
    if (townWaterClearance(s, { x, y }) < BANK + size + 2) continue
    if (!clearOfDistricts(x, y, WILD_HEIGHT[style])) continue
    if (!roomFor(x, y, size)) continue
    add({ x, y, style, size, variant })
  }

  return items.sort((a, b) => a.y - b.y)
}

// River life: spots where fish leap, and stretches where ducks paddle. Only
// rivers have them (a wadi is mostly dry; a pool is too small for a stretch).
export interface RiverLife {
  fish: Array<{ water: string; along: number; side: number; seed: number }>
  ducks: Array<{ water: string; along: number; range: number; side: number; seed: number }>
}

export function riverLife(s: ScenarioDef): RiverLife {
  const rand = mulberry32(SEED ^ 0xf15)
  const fish: RiverLife['fish'] = []
  const ducks: RiverLife['ducks'] = []
  for (const w of s.water) {
    if (w.kind !== 'river') continue
    for (let i = 0; i < 7; i++) {
      const along = 0.06 + (i / 7) * 0.88 + rand() * 0.05
      if (nearCrossing(s, alongRiver(w.points, along).p, 40)) continue
      fish.push({ water: w.id, along, side: rand() * 2 - 1, seed: rand() * 10 })
    }
    // Ducks keep to the longest stretch of open water between crossings.
    const stops = [0, 1, ...s.crossings.filter((c) => c.water === w.id).map((c) => alongOf(w.points, c.point))].sort(
      (a, b) => a - b,
    )
    let gap = { from: stops[0], to: stops[1] }
    for (let i = 1; i < stops.length - 1; i++) {
      if (stops[i + 1] - stops[i] > gap.to - gap.from) gap = { from: stops[i], to: stops[i + 1] }
    }
    for (const at of [0.22, 0.5, 0.77]) {
      ducks.push({
        water: w.id,
        along: gap.from + (gap.to - gap.from) * at,
        range: 0.04 + rand() * 0.03,
        side: rand() * 2 - 1,
        seed: rand() * 10,
      })
    }
  }
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
