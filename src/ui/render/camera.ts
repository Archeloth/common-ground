import type { Point } from '../../game/geometry'
import type { Bounds } from '../../game/scenario'

// A camera maps world coordinates to screen (CSS pixel) coordinates:
//   screen = (world - camera.x/y) * zoom
// It lives in a ref, not React state, so panning and zooming never re-render
// React — the canvas redraws from the ref instead (performance playbook).

export interface Camera {
  x: number
  y: number
  zoom: number
}

export const MIN_ZOOM = 0.35
export const MAX_ZOOM = 3

export function clampZoom(zoom: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom))
}

export function worldToScreen(c: Camera, wx: number, wy: number): Point {
  return { x: (wx - c.x) * c.zoom, y: (wy - c.y) * c.zoom }
}

export function screenToWorld(c: Camera, sx: number, sy: number): Point {
  return { x: sx / c.zoom + c.x, y: sy / c.zoom + c.y }
}

export function zoomAt(c: Camera, factor: number, sx: number, sy: number): Camera {
  const zoom = clampZoom(c.zoom * factor)
  // Keep the world point under the cursor fixed while zooming.
  const wx = c.x + sx / c.zoom
  const wy = c.y + sy / c.zoom
  return { x: wx - sx / zoom, y: wy - sy / zoom, zoom }
}

export function panBy(c: Camera, dx: number, dy: number): Camera {
  return { x: c.x - dx / c.zoom, y: c.y - dy / c.zoom, zoom: c.zoom }
}

// Follow camera: centres the scenario bounds and zooms to fit the view.
export function cameraThatFits(bounds: Bounds, viewWidth: number, viewHeight: number): Camera {
  const zoom = clampZoom(Math.min(viewWidth / bounds.width, viewHeight / bounds.height) * 0.92)
  const cx = bounds.minX + bounds.width / 2
  const cy = bounds.minY + bounds.height / 2
  return { x: cx - viewWidth / zoom / 2, y: cy - viewHeight / zoom / 2, zoom }
}
