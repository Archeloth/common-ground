import { describe, expect, it } from 'vitest'
import { blobPoints, BLOB_MAX_RADIUS_FACTOR, BLOB_STEPS, BLOB_Y_SQUASH } from './blob'

describe('blobPoints', () => {
  it('produces identical points for the same seed (and centre and radius)', () => {
    const a = blobPoints(48213, 100, 200, 70)
    const b = blobPoints(48213, 100, 200, 70)
    expect(a).toEqual(b)
  })

  it('returns BLOB_STEPS + 1 points and closes the outline', () => {
    const pts = blobPoints(1177, 170, 110, 72)
    expect(pts).toHaveLength(BLOB_STEPS + 1)
    // First and last sample land on the same angle (0 and 2π).
    expect(pts[0].x).toBeCloseTo(pts[pts.length - 1].x, 12)
    expect(pts[0].y).toBeCloseTo(pts[pts.length - 1].y, 12)
  })

  it('keeps every point inside the wobble envelope', () => {
    const r = 70
    for (let seed = 0; seed < 25; seed++) {
      for (const p of blobPoints(seed, 500, 400, r)) {
        const dx = p.x - 500
        const dy = (p.y - 400) / BLOB_Y_SQUASH
        const dist = Math.hypot(dx, dy)
        expect(dist).toBeLessThanOrEqual(r * BLOB_MAX_RADIUS_FACTOR)
      }
    }
  })

  it('applies the vertical squash', () => {
    const pts = blobPoints(7, 0, 0, 100)
    const maxX = Math.max(...pts.map((p) => Math.abs(p.x)))
    const maxY = Math.max(...pts.map((p) => Math.abs(p.y)))
    expect(maxY).toBeLessThan(maxX)
    expect(maxY).toBeLessThanOrEqual(100 * BLOB_Y_SQUASH * BLOB_MAX_RADIUS_FACTOR)
  })

  it('uses the seed to shape the blob', () => {
    expect(blobPoints(11, 0, 0, 50)).not.toEqual(blobPoints(12, 0, 0, 50))
  })
})
