import { describe, expect, it } from 'vitest'
import {
  cameraThatFits,
  clampZoom,
  MAX_ZOOM,
  MIN_ZOOM,
  panBy,
  screenToWorld,
  worldToScreen,
  zoomAt,
} from './camera'
import type { Camera } from './camera'

const camera: Camera = { x: 100, y: 50, zoom: 2 }

describe('camera', () => {
  it('round-trips world and screen coordinates', () => {
    for (const [wx, wy] of [[0, 0], [100, 50], [482.5, 13.7]] as const) {
      const s = worldToScreen(camera, wx, wy)
      const w = screenToWorld(camera, s.x, s.y)
      expect(w.x).toBeCloseTo(wx, 9)
      expect(w.y).toBeCloseTo(wy, 9)
    }
  })

  it('panBy moves the camera opposite to the pointer drag', () => {
    const panned = panBy(camera, -40, 20)
    expect(panned.x).toBeCloseTo(camera.x + 20, 9)
    expect(panned.y).toBeCloseTo(camera.y - 10, 9)
    expect(panned.zoom).toBe(camera.zoom)
  })

  it('zoomAt keeps the world point under the cursor fixed', () => {
    const cam: Camera = { x: 100, y: 50, zoom: 1 }
    const sx = 120
    const sy = 80
    const before = screenToWorld(cam, sx, sy)
    const z = zoomAt(cam, 1.6, sx, sy)
    const after = screenToWorld(z, sx, sy)
    expect(after.x).toBeCloseTo(before.x, 9)
    expect(after.y).toBeCloseTo(before.y, 9)
    expect(z.zoom).toBeCloseTo(cam.zoom * 1.6, 9)
  })

  it('clamps zoom to [MIN_ZOOM, MAX_ZOOM], also through zoomAt', () => {
    expect(clampZoom(0.1)).toBe(MIN_ZOOM)
    expect(clampZoom(9)).toBe(MAX_ZOOM)
    expect(clampZoom(1)).toBe(1)
    expect(zoomAt(camera, 1000, 0, 0).zoom).toBe(MAX_ZOOM)
    expect(zoomAt(camera, 0.0001, 0, 0).zoom).toBe(MIN_ZOOM)
  })

  it('cameraThatFits centres the world in the view', () => {
    const bounds = { minX: 100, minY: 200, width: 800, height: 400 }
    const cam = cameraThatFits(bounds, 800, 400)
    const c = worldToScreen(cam, 500, 400) // centre of bounds
    expect(c.x).toBeCloseTo(400, 6) // half the view width
    expect(c.y).toBeCloseTo(200, 6) // half the view height
  })
})
