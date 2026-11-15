export interface Point {
  x: number
  y: number
}

// Classic ray-casting point-in-polygon test.
//
// Used for blob hit-testing so "which neighborhood is under the pointer" is a
// pure, testable maths call instead of a canvas-only query. The plan suggests
// ctx.isPointInPath; this is the same result with CI coverage. (Development
// plan, Graphics section: hit-testing.)
export function pointInPolygon(poly: readonly Point[], px: number, py: number): boolean {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x
    const yi = poly[i].y
    const xj = poly[j].x
    const yj = poly[j].y
    const crosses = yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi
    if (crosses) inside = !inside
  }
  return inside
}

// --- Milestone 8.5: river crossings ------------------------------------------
// The river may be crossed only at a bridge. Adjacency is content, so the
// scenario validator uses these pure segment checks to prove that every
// neighbour pair whose link crosses the river is a bridge pair.

function cross(o: Point, a: Point, b: Point): number {
  return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x)
}

function onSegment(a: Point, b: Point, p: Point): boolean {
  return (
    Math.min(a.x, b.x) - 1e-9 <= p.x &&
    p.x <= Math.max(a.x, b.x) + 1e-9 &&
    Math.min(a.y, b.y) - 1e-9 <= p.y &&
    p.y <= Math.max(a.y, b.y) + 1e-9
  )
}

// Do the closed segments a-b and c-d intersect (including touching at an
// endpoint or a collinear overlap)? Touching counts: a bus line that brushes
// the river bank is still a line across the water.
export function segmentsCross(a: Point, b: Point, c: Point, d: Point): boolean {
  const d1 = cross(c, d, a)
  const d2 = cross(c, d, b)
  const d3 = cross(a, b, c)
  const d4 = cross(a, b, d)
  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) {
    return true
  }
  if (d1 === 0 && onSegment(c, d, a)) return true
  if (d2 === 0 && onSegment(c, d, b)) return true
  if (d3 === 0 && onSegment(a, b, c)) return true
  if (d4 === 0 && onSegment(a, b, d)) return true
  return false
}

// Does the segment from->to touch any segment of the polyline?
export function segmentHitsPolyline(from: Point, to: Point, polyline: readonly Point[]): boolean {
  for (let i = 0; i < polyline.length - 1; i++) {
    if (segmentsCross(from, to, polyline[i], polyline[i + 1])) return true
  }
  return false
}

// Shortest distance from p to the closed segment a-b.
export function distanceToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const lenSq = dx * dx + dy * dy
  if (lenSq === 0) return Math.hypot(p.x - a.x, p.y - a.y)
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq))
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy))
}
