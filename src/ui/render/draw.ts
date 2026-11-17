import type { Point } from '../../game/geometry'
import type { Camera } from './camera'
import { worldToScreen } from './camera'
import { COLORS } from './colors'

// Canvas drawing helpers. This is the only place Path2D is built; the
// simulation (src/game) stays free of DOM types so it runs in plain Node.

const RAISED_DEPTH = 6
export const HOVER_LIFT = 4

export function buildPath2D(points: readonly Point[]): Path2D {
  const path = new Path2D()
  points.forEach((p, i) => {
    if (i === 0) path.moveTo(p.x, p.y)
    else path.lineTo(p.x, p.y)
  })
  path.closePath()
  return path
}

// Fake thickness: draw the same path a few times, 1px lower each step, then the
// top face — a raised, chunky edge with no 3D engine (plan, Graphics section).
export function drawRaisedBlob(
  ctx: CanvasRenderingContext2D,
  path: Path2D,
  top: string,
  side: string,
  lift = 0,
  depth = RAISED_DEPTH,
): void {
  ctx.save()
  ctx.translate(0, -lift) // hover lift: raise toward the viewer
  ctx.fillStyle = side
  for (let d = depth; d > 0; d--) {
    ctx.save()
    ctx.translate(0, d)
    ctx.fill(path)
    ctx.restore()
  }
  ctx.fillStyle = top
  ctx.fill(path)
  ctx.restore()
}

// The river is a wide stroke through the scenario's polyline, smoothed with
// quadratic curves through the segment midpoints so it reads as water.
export function drawRiver(
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  points: readonly Point[],
  halfDepth: number,
): void {
  const pts = points.map((p) => worldToScreen(cam, p.x, p.y))
  if (pts.length < 2) return
  ctx.save()
  ctx.beginPath()
  ctx.moveTo(pts[0].x, pts[0].y)
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i].x + pts[i + 1].x) / 2
    const my = (pts[i].y + pts[i + 1].y) / 2
    ctx.quadraticCurveTo(pts[i].x, pts[i].y, mx, my)
  }
  ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.strokeStyle = COLORS.riverBank
  ctx.lineWidth = (halfDepth * 2 + 10) * cam.zoom
  ctx.stroke()
  ctx.strokeStyle = COLORS.river
  ctx.lineWidth = halfDepth * 2 * cam.zoom
  ctx.stroke()
  ctx.restore()
}

// A fixed bridge across the river (Milestone 8.5): a plank deck with two rails,
// running north-south over the water at the scenario's bridge point.
export function drawBridge(ctx: CanvasRenderingContext2D, cam: Camera, at: Point, halfDepth: number): void {
  const c = worldToScreen(cam, at.x, at.y)
  const width = 30 * cam.zoom
  const length = (halfDepth * 2 + 22) * cam.zoom
  const x = c.x - width / 2
  const y = c.y - length / 2
  ctx.save()
  ctx.fillStyle = COLORS.bridgeShadow
  ctx.fillRect(x + 2 * cam.zoom, y + 3 * cam.zoom, width, length)
  ctx.fillStyle = COLORS.bridgeDeck
  ctx.fillRect(x, y, width, length)
  ctx.strokeStyle = COLORS.bridgeRail
  ctx.lineWidth = Math.max(1.5, 3 * cam.zoom)
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(x, y + length)
  ctx.moveTo(x + width, y)
  ctx.lineTo(x + width, y + length)
  ctx.stroke()
  // Planks: a few thin cross lines so the deck reads as a bridge.
  ctx.lineWidth = Math.max(0.5, 1 * cam.zoom)
  ctx.globalAlpha = 0.45
  for (let py = y + 8 * cam.zoom; py < y + length; py += 8 * cam.zoom) {
    ctx.beginPath()
    ctx.moveTo(x, py)
    ctx.lineTo(x + width, py)
    ctx.stroke()
  }
  ctx.restore()
}

// A dashed bus line through world points (Milestone 7 bus links): blob centre
// to blob centre, via the bridge when the link crosses the river.
export function drawBusLine(
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  route: readonly Point[],
  color = COLORS.bus,
): void {
  const pts = route.map((p) => worldToScreen(cam, p.x, p.y))
  ctx.save()
  ctx.beginPath()
  pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)))
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  const width = Math.max(3, 5 * cam.zoom)
  // A soft casing first, so the route reads over busy district ground.
  ctx.strokeStyle = 'rgba(251, 248, 236, 0.75)'
  ctx.lineWidth = width + Math.max(3, 4 * cam.zoom)
  ctx.stroke()
  ctx.strokeStyle = color
  ctx.lineWidth = width
  ctx.setLineDash([6, 6])
  ctx.stroke()
  ctx.restore()
}

// A pulsing ring around a neighbourhood blob, used by the tutorial (Milestone
// 8) to point at the neighbourhoods the current step is about. The phase comes
// from the wall clock so the ring breathes while the canvas keeps redrawing.
export function drawPulseRing(
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  center: Point,
  worldRadius: number,
  now: number,
  color = COLORS.pulse,
): void {
  const c = worldToScreen(cam, center.x, center.y)
  const phase = (now / 700) % 1
  const radius = (worldRadius + 10 + phase * 16) * cam.zoom
  ctx.save()
  ctx.beginPath()
  ctx.arc(c.x, c.y, radius, 0, Math.PI * 2)
  ctx.strokeStyle = color
  ctx.globalAlpha = 0.75 - phase * 0.55
  ctx.lineWidth = Math.max(2.5, 4 * cam.zoom)
  ctx.stroke()
  ctx.restore()
}

// A small round badge at a blob's top-right edge (Milestone 8.5: an hourglass
// on districts where a project has run its course).
export function drawBadge(
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  center: Point,
  worldRadius: number,
  glyph: string,
): void {
  const c = worldToScreen(cam, center.x + worldRadius * 0.7, center.y - worldRadius * 0.45)
  // Readable when zoomed out, but never a giant coin when zoomed in.
  const r = Math.min(14, Math.max(9, 11 * cam.zoom))
  ctx.save()
  ctx.beginPath()
  ctx.arc(c.x, c.y, r, 0, Math.PI * 2)
  ctx.fillStyle = COLORS.badge
  ctx.fill()
  ctx.lineWidth = 2
  ctx.strokeStyle = '#fff'
  ctx.stroke()
  ctx.fillStyle = '#fff'
  ctx.font = `${Math.round(r * 1.1)}px system-ui, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(glyph, c.x, c.y + 1)
  ctx.restore()
}
