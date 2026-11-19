import type { CrossingDef, ScenarioDef, WaterFeature, WorldPoint } from './types'
import { distanceToSegment, pointInPolygon, segmentHitsPolyline } from './geometry'

// Water on the map (Milestone 10): a list of features instead of one fixed
// river. Rivers and wadis are polylines with a half width; an oasis is a
// closed pool. Links between districts cross a river or wadi only at a
// crossing (bridge, ford or ferry); nothing crosses an oasis, districts sit
// around it. A town may have no water at all.

export const WATER_KINDS = ['river', 'wadi', 'oasis'] as const
export const CROSSING_KINDS = ['bridge', 'ford', 'ferry'] as const

// The pool's outline as a closed ring (first point repeated at the end).
export function ring(points: readonly WorldPoint[]): WorldPoint[] {
  return points.length > 0 ? [...points, points[0]] : []
}

export function isPool(feature: WaterFeature): boolean {
  return feature.kind === 'oasis'
}

// Distance from p to the water's edge: negative inside the water. For a
// river or wadi the edge is halfDepth from its centre line.
export function waterClearance(feature: WaterFeature, p: WorldPoint): number {
  if (isPool(feature)) {
    const edges = ring(feature.points)
    let d = Infinity
    for (let i = 0; i < edges.length - 1; i++) d = Math.min(d, distanceToSegment(p, edges[i], edges[i + 1]))
    return pointInPolygon(feature.points, p.x, p.y) ? -d : d
  }
  const pts = feature.points
  let d = Infinity
  for (let i = 0; i < pts.length - 1; i++) d = Math.min(d, distanceToSegment(p, pts[i], pts[i + 1]))
  return d - feature.halfDepth
}

// The smallest clearance to any water in the town (Infinity without water).
export function townWaterClearance(s: ScenarioDef, p: WorldPoint): number {
  let best = Infinity
  for (const feature of s.water) best = Math.min(best, waterClearance(feature, p))
  return best
}

// Does the straight link a-b cross this water?
export function linkCrossesWater(feature: WaterFeature, a: WorldPoint, b: WorldPoint): boolean {
  if (isPool(feature)) {
    return (
      segmentHitsPolyline(a, b, ring(feature.points)) ||
      pointInPolygon(feature.points, a.x, a.y) ||
      pointInPolygon(feature.points, b.x, b.y)
    )
  }
  return segmentHitsPolyline(a, b, feature.points)
}

export function waterById(s: ScenarioDef, id: string): WaterFeature | undefined {
  return s.water.find((w) => w.id === id)
}

function joins(c: CrossingDef, a: string, b: string): boolean {
  return (c.from === a && c.to === b) || (c.from === b && c.to === a)
}

// Every crossing on the link between two districts, nearest to `a` first,
// so a route can pass through them in order.
export function crossingsBetween(s: ScenarioDef, a: string, b: string): CrossingDef[] {
  const start = s.neighborhoods.find((n) => n.id === a)?.shape
  const found = s.crossings.filter((c) => joins(c, a, b))
  if (!start) return found
  return found.sort(
    (p, q) => Math.hypot(p.point.x - start.x, p.point.y - start.y) - Math.hypot(q.point.x - start.x, q.point.y - start.y),
  )
}

// The water's direction at a crossing: unit tangent along the water and the
// normal across it (the way a bridge deck runs), plus the half width there.
export function crossingFrame(
  s: ScenarioDef,
  c: CrossingDef,
): { tangent: WorldPoint; normal: WorldPoint; halfDepth: number } {
  const feature = waterById(s, c.water)
  const pts = feature?.points ?? []
  let best = { d: Infinity, tx: 1, ty: 0 }
  for (let i = 0; i < pts.length - 1; i++) {
    const d = distanceToSegment(c.point, pts[i], pts[i + 1])
    if (d < best.d) {
      const dx = pts[i + 1].x - pts[i].x
      const dy = pts[i + 1].y - pts[i].y
      const len = Math.hypot(dx, dy) || 1
      best = { d, tx: dx / len, ty: dy / len }
    }
  }
  return { tangent: { x: best.tx, y: best.ty }, normal: { x: -best.ty, y: best.tx }, halfDepth: feature?.halfDepth ?? 0 }
}

// Is p within `clearance` of a crossing, measured along the water (so reeds
// and lily pads stay off the deck but may grow right beside it)?
export function nearCrossing(s: ScenarioDef, p: WorldPoint, clearance: number): boolean {
  return s.crossings.some((c) => {
    const { tangent, halfDepth } = crossingFrame(s, c)
    const dx = p.x - c.point.x
    const dy = p.y - c.point.y
    const along = Math.abs(dx * tangent.x + dy * tangent.y)
    const across = Math.abs(dx * -tangent.y + dy * tangent.x)
    return along < clearance && across < halfDepth + 40
  })
}
