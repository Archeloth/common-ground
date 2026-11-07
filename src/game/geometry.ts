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
