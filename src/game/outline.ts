import { townWaterClearance } from './water'
import type { Point } from './geometry'
import { BLOB_Y_SQUASH, blobRadius } from './blob'
import { mulberry32 } from './random'
import type { NeighborhoodDef, ScenarioDef } from './types'

// District outlines that meet their land neighbours (post-Milestone 9 map).
//
// Each district starts as its seeded wobbly blob. Toward every neighbour it
// shares land with (a neighbour without a bridge), the blob reaches out until
// it meets that neighbour along a shared, gently wavy seam - so the town reads
// as one patchwork of districts instead of a grid of islands. Every outline is
// also clipped against every other district's seam (with a small gap for
// districts that are not neighbours) and kept clear of the river, so outlines
// never overlap: hit-testing does not depend on draw order.
//
// The maths works in "unsquashed" space (y / BLOB_Y_SQUASH) so seams are
// round, then squashes back. Each outline is a radial function of the angle
// around its centre, so it is star-shaped: shrinking it toward the centre (the
// scene layout does this) stays inside it. Pure and deterministic.

export const OUTLINE_STEPS = 96

// Toward a land neighbour, the blob reaches out across this angular window
// (half-width), fully inside the plateau and easing back to the blob outside it.
const REACH_WINDOW = (56 * Math.PI) / 180
const REACH_PLATEAU = (12 * Math.PI) / 180
// Reach a little past the seam so the seam, not the reach, sets the edge.
const SEAM_OVERSHOOT = 14
// Districts that are not neighbours never touch: each keeps half of this gap.
const STRANGER_GAP = 14
// How wavy a seam is (unsquashed world units) and over what length.
const SEAM_WAVE = 6
const SEAM_WAVELENGTH = 150
// Ground left between a district and the river bank (beyond the drawn bank).
const RIVER_MARGIN = 12
const RIVER_BANK = 5 // the drawn bank stroke reaches this far past halfDepth

interface Vec {
  x: number
  y: number
}

interface Seam {
  p0: Vec // a point on the seam's centre line, in unsquashed space
  u: Vec // unit normal, from the "low" district toward the "high" one
  v: Vec // unit tangent
  wave: (s: number) => number // offset along u at tangent position s
}

function unsquash(p: Point): Vec {
  return { x: p.x, y: p.y / BLOB_Y_SQUASH }
}

function hashString(text: string): number {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

// The seam between two districts, defined once per pair (ids sorted), so both
// sides compute exactly the same curve.
function seamBetween(a: NeighborhoodDef, b: NeighborhoodDef): Seam {
  const [lo, hi] = a.id < b.id ? [a, b] : [b, a]
  const cl = unsquash(lo.shape)
  const ch = unsquash(hi.shape)
  const dx = ch.x - cl.x
  const dy = ch.y - cl.y
  const d = Math.hypot(dx, dy) || 1
  const u = { x: dx / d, y: dy / d }
  const v = { x: -u.y, y: u.x }
  // Weighted by radius: the bigger district gets the bigger share of the gap.
  const m = (d * lo.shape.radius) / (lo.shape.radius + hi.shape.radius)
  const p0 = { x: cl.x + u.x * m, y: cl.y + u.y * m }
  const rand = mulberry32(hashString(`${lo.id}|${hi.id}`))
  const phase1 = rand() * Math.PI * 2
  const phase2 = rand() * Math.PI * 2
  const k = (Math.PI * 2) / SEAM_WAVELENGTH
  const wave = (s: number) => SEAM_WAVE * (0.7 * Math.sin(s * k + phase1) + 0.3 * Math.sin(s * k * 2.3 + phase2))
  return { p0, u, v, wave }
}

// Distance along the ray from `c` (unsquashed) in direction `e` to the seam,
// shifted by `offset` along u. Infinity when the ray heads away from it.
function rayToSeam(c: Vec, e: Vec, seam: Seam, offset: number): number {
  const qx = c.x - seam.p0.x
  const qy = c.y - seam.p0.y
  const qn = qx * seam.u.x + qy * seam.u.y
  const qs = qx * seam.v.x + qy * seam.v.y
  const en = e.x * seam.u.x + e.y * seam.u.y
  const es = e.x * seam.v.x + e.y * seam.v.y
  if (Math.abs(en) < 1e-6) return Infinity
  // Fixed-point iterations on the wavy seam (its slope is small, so this converges).
  let t = (offset - qn) / en
  for (let i = 0; i < 6; i++) {
    if (!(t > 0)) return Infinity
    const s = qs + es * t
    t = (seam.wave(s) + offset - qn) / en
  }
  return t > 0 ? t : Infinity
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const k = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)))
  return k * k * (3 - 2 * k)
}

function landNeighbours(s: ScenarioDef, n: NeighborhoodDef): NeighborhoodDef[] {
  return n.neighbors
    .filter((id) => !s.crossings.some((c) => (c.from === n.id && c.to === id) || (c.from === id && c.to === n.id)))
    .map((id) => s.neighborhoods.find((o) => o.id === id))
    .filter((o): o is NeighborhoodDef => o !== undefined)
}


function computeOutline(s: ScenarioDef, n: NeighborhoodDef): Point[] {
  const c = unsquash(n.shape)
  const base = blobRadius(n.shape.seed, n.shape.radius)
  const land = landNeighbours(s, n)
  const landIds = new Set(land.map((o) => o.id))
  const others = s.neighborhoods
    .filter((o) => o.id !== n.id)
    .map((o) => {
      const seam = seamBetween(n, o)
      const isLow = n.id < o.id
      const gap = landIds.has(o.id) ? 0 : STRANGER_GAP / 2
      // The low district's edge sits below the seam (along u), the high one's above.
      return { o, seam, offset: isLow ? -gap : gap, land: landIds.has(o.id) }
    })
  const toward = land.map((o) => {
    const co = unsquash(o.shape)
    return Math.atan2(co.y - c.y, co.x - c.x)
  })
  const minClearance = RIVER_BANK + RIVER_MARGIN
  const nearWater = (p: Point) => townWaterClearance(s, p) < minClearance
  const at = (a: number, t: number): Point => ({
    x: n.shape.x + Math.cos(a) * t,
    y: n.shape.y + Math.sin(a) * t * BLOB_Y_SQUASH,
  })

  const points: Point[] = []
  for (let i = 0; i <= OUTLINE_STEPS; i++) {
    const a = (i / OUTLINE_STEPS) * Math.PI * 2
    const e = { x: Math.cos(a), y: Math.sin(a) }
    const b = base(a)
    let r = b
    // Reach out toward land neighbours.
    others.forEach((entry) => {
      if (!entry.land) return
      const k = land.findIndex((o) => o.id === entry.o.id)
      const delta = Math.cos(a - toward[k])
      const weight = smoothstep(Math.cos(REACH_WINDOW), Math.cos(REACH_PLATEAU), delta)
      if (weight <= 0) return
      const hit = rayToSeam(c, e, entry.seam, entry.offset)
      if (!Number.isFinite(hit)) return
      r = Math.max(r, b + (hit + SEAM_OVERSHOOT - b) * weight)
    })
    // Never cross any seam (neighbours meet on it, others keep a gap).
    for (const entry of others) r = Math.min(r, rayToSeam(c, e, entry.seam, entry.offset))
    // Stay clear of the water, with a strip of bank.
    if (nearWater(at(a, r)) || nearWater(at(a, r * 0.5))) {
      let lo = 0
      let hi = r
      // March to the first point too close to the water, then bisect.
      for (let t = 4; t < r; t += 4) {
        if (nearWater(at(a, t))) {
          hi = t
          break
        }
        lo = t
      }
      for (let k = 0; k < 12; k++) {
        const mid = (lo + hi) / 2
        if (nearWater(at(a, mid))) hi = mid
        else lo = mid
      }
      r = lo
    }
    points.push(at(a, r))
  }
  return points
}

const cache = new WeakMap<ScenarioDef, Map<string, Point[]>>()

// The district's outline in world coordinates: OUTLINE_STEPS + 1 points, the
// last equal to the first. Computed once per district and cached.
export function districtOutline(s: ScenarioDef, id: string): Point[] {
  let byId = cache.get(s)
  if (!byId) {
    byId = new Map()
    cache.set(s, byId)
  }
  let points = byId.get(id)
  if (!points) {
    const n = s.neighborhoods.find((o) => o.id === id)
    if (!n) throw new Error(`Unknown neighborhood: ${id}`)
    points = computeOutline(s, n)
    byId.set(id, points)
  }
  return points
}

export interface Box {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

export function outlineBox(points: readonly Point[]): Box {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const p of points) {
    minX = Math.min(minX, p.x)
    maxX = Math.max(maxX, p.x)
    minY = Math.min(minY, p.y)
    maxY = Math.max(maxY, p.y)
  }
  return { minX, minY, maxX, maxY }
}
