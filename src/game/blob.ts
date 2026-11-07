import type { Point } from './geometry'
import { mulberry32 } from './random'

// Blob geometry for the 2.5D top-down look (development plan, Graphics).
// The wobble amplitude is 0.06 + rand() * 0.1, i.e. at most 16% of the radius.
export const BLOB_Y_SQUASH = 0.6
// Radius wobble per sine wave is at most 16%; three waves can align, so the
// blob's extent is at most (1 + 3 * 0.16) * radius. Tests rely on this bound.
export const BLOB_MAX_WOBBLE = 0.16
export const BLOB_MAX_RADIUS_FACTOR = 1 + 3 * BLOB_MAX_WOBBLE
// How many segments the wobbled circle is sampled into.
export const BLOB_STEPS = 48

// Blob outline from a seed: a circle whose radius wobbles with a few sine
// waves, squashed vertically for the top-down tilt.
//
// Pure geometry on purpose: the UI builds a Path2D from these points for
// drawing, so the shape stays testable in Node. Same seed -> same blob.
export function blobPoints(seed: number, cx: number, cy: number, r: number): Point[] {
  const rand = mulberry32(seed)
  const waves = [2, 3, 5].map((k) => ({
    k,
    amp: 0.06 + rand() * 0.1,
    phase: rand() * Math.PI * 2,
  }))

  const points: Point[] = []
  for (let i = 0; i <= BLOB_STEPS; i++) {
    const a = (i / BLOB_STEPS) * Math.PI * 2
    let rr = r
    for (const w of waves) rr += r * w.amp * Math.sin(w.k * a + w.phase)
    points.push({ x: cx + Math.cos(a) * rr, y: cy + Math.sin(a) * rr * BLOB_Y_SQUASH })
  }
  return points
}
