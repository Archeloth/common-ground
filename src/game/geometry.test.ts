import { describe, expect, it } from 'vitest'
import { distanceToSegment, pointInPolygon, segmentHitsPolyline, segmentsCross } from './geometry'
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
describe('segmentsCross', () => {
  it('detects a proper crossing', () => {
    expect(segmentsCross({ x: 0, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }, { x: 10, y: 0 })).toBe(true)
  })

  it('detects a touch at a shared endpoint', () => {
    expect(segmentsCross({ x: 0, y: 0 }, { x: 5, y: 5 }, { x: 5, y: 5 }, { x: 10, y: 0 })).toBe(true)
  })

  it('rejects disjoint segments', () => {
    expect(segmentsCross({ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 5, y: 5 }, { x: 6, y: 4 })).toBe(false)
  })

  it('rejects collinear segments that do not overlap', () => {
    expect(segmentsCross({ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 })).toBe(false)
  })
})

describe('segmentHitsPolyline and distanceToSegment', () => {
  const river = [
    { x: 30, y: 340 },
    { x: 560, y: 352 },
    { x: 930, y: 338 },
  ]

  it('finds a north-south link crossing the river', () => {
    expect(segmentHitsPolyline({ x: 500, y: 235 }, { x: 500, y: 448 }, river)).toBe(true)
  })

  it('ignores a same-bank link', () => {
    expect(segmentHitsPolyline({ x: 170, y: 235 }, { x: 430, y: 237 }, river)).toBe(false)
  })

  it('measures the distance to a segment, clamped to its ends', () => {
    expect(distanceToSegment({ x: 5, y: 3 }, { x: 0, y: 0 }, { x: 10, y: 0 })).toBe(3)
    expect(distanceToSegment({ x: 13, y: 4 }, { x: 0, y: 0 }, { x: 10, y: 0 })).toBe(5)
  })
})
