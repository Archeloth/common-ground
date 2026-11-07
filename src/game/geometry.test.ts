import { describe, expect, it } from 'vitest'
import { pointInPolygon } from './geometry'
import { blobPoints } from './blob'

const square = [
  { x: 0, y: 0 },
  { x: 10, y: 0 },
  { x: 10, y: 10 },
  { x: 0, y: 10 },
]

describe('pointInPolygon', () => {
  it('detects a point inside the polygon', () => {
    expect(pointInPolygon(square, 5, 5)).toBe(true)
    expect(pointInPolygon(square, 1, 1)).toBe(true)
  })

  it('detects a point outside the polygon', () => {
    expect(pointInPolygon(square, 11, 5)).toBe(false)
    expect(pointInPolygon(square, 5, -1)).toBe(false)
    expect(pointInPolygon(square, -1, 5)).toBe(false)
  })

  it('handles the concave heart of a real blob', () => {
    const pts = blobPoints(48213, 100, 200, 70)
    expect(pointInPolygon(pts, 100, 200)).toBe(true) // the centre
    expect(pointInPolygon(pts, 1000, 200)).toBe(false) // far away
    expect(pointInPolygon(pts, 95, 190)).toBe(true) // near the centre
  })
})
