import type { Point } from '../../game/geometry'
import type { CrossingDef, CrossingKind, WaterFeature, WaterKind } from '../../game/types'
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

// Water (Milestone 8.5; a list of features since Milestone 10). A river or
// wadi is a wide stroke through its polyline, smoothed with quadratic curves
// through the segment midpoints so it reads as water; a pool is a filled,
// smoothed outline with a bank.
function smoothPath(ctx: CanvasRenderingContext2D, pts: readonly Point[], closed: boolean): void {
  ctx.beginPath()
  if (closed) {
    const mid = (a: Point, b: Point) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })
    const start = mid(pts[pts.length - 1], pts[0])
    ctx.moveTo(start.x, start.y)
    for (let i = 0; i < pts.length; i++) {
      const m = mid(pts[i], pts[(i + 1) % pts.length])
      ctx.quadraticCurveTo(pts[i].x, pts[i].y, m.x, m.y)
    }
    ctx.closePath()
    return
  }
  ctx.moveTo(pts[0].x, pts[0].y)
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i].x + pts[i + 1].x) / 2
    const my = (pts[i].y + pts[i + 1].y) / 2
    ctx.quadraticCurveTo(pts[i].x, pts[i].y, mx, my)
  }
  ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y)
}

type WaterLevel = 'dry' | 'low' | 'normal' | 'high'
type WaterDrawer = (ctx: CanvasRenderingContext2D, cam: Camera, pts: readonly Point[], half: number, level: WaterLevel) => void

const WATER_DRAWERS: Record<WaterKind, WaterDrawer> = {
  river: (ctx, cam, pts, half) => {
    smoothPath(ctx, pts, false)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = COLORS.riverBank
    ctx.lineWidth = (half * 2 + 10) * cam.zoom
    ctx.stroke()
    ctx.strokeStyle = COLORS.river
    ctx.lineWidth = half * 2 * cam.zoom
    ctx.stroke()
  },
  // A sandy bed; water runs in it only in the wet season (Milestone 10).
  wadi: (ctx, cam, pts, half, level) => {
    smoothPath(ctx, pts, false)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = COLORS.wadiBank
    ctx.lineWidth = (half * 2 + 8) * cam.zoom
    ctx.stroke()
    ctx.strokeStyle = COLORS.wadiBed
    ctx.lineWidth = half * 2 * cam.zoom
    ctx.stroke()
    if (level === 'dry') return
    const share = level === 'low' ? 0.2 : level === 'normal' ? 0.45 : 0.85
    ctx.strokeStyle = COLORS.river
    ctx.lineWidth = Math.max(1, half * 2 * share * cam.zoom)
    ctx.stroke()
  },
  oasis: (ctx, cam, pts) => {
    smoothPath(ctx, pts, true)
    ctx.lineJoin = 'round'
    ctx.strokeStyle = COLORS.riverBank
    ctx.lineWidth = 10 * cam.zoom
    ctx.stroke()
    ctx.fillStyle = COLORS.river
    ctx.fill()
  },
}

export function drawWater(ctx: CanvasRenderingContext2D, cam: Camera, feature: WaterFeature, level: WaterLevel = 'normal'): void {
  const pts = feature.points.map((p) => worldToScreen(cam, p.x, p.y))
  if (pts.length < 2) return
  ctx.save()
  WATER_DRAWERS[feature.kind](ctx, cam, pts, feature.halfDepth, level)
  ctx.restore()
}

// Crossings are drawn in their own frame: x along the water, y across it
// (the way a bridge deck runs), centred on the crossing point.
type CrossingDrawer = (ctx: CanvasRenderingContext2D, zoom: number, span: number) => void

const CROSSING_DRAWERS: Record<CrossingKind, CrossingDrawer> = {
  // A plank deck with two rails (Milestone 8.5).
  bridge: (ctx, zoom, span) => {
    const width = 30 * zoom
    const length = (span + 22) * zoom
    const x = -width / 2
    const y = -length / 2
    ctx.fillStyle = COLORS.bridgeShadow
    ctx.fillRect(x + 2 * zoom, y + 3 * zoom, width, length)
    ctx.fillStyle = COLORS.bridgeDeck
    ctx.fillRect(x, y, width, length)
    ctx.strokeStyle = COLORS.bridgeRail
    ctx.lineWidth = Math.max(1.5, 3 * zoom)
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x, y + length)
    ctx.moveTo(x + width, y)
    ctx.lineTo(x + width, y + length)
    ctx.stroke()
    // Planks: a few thin cross lines so the deck reads as a bridge.
    ctx.lineWidth = Math.max(0.5, 1 * zoom)
    ctx.globalAlpha = 0.45
    for (let py = y + 8 * zoom; py < y + length; py += 8 * zoom) {
      ctx.beginPath()
      ctx.moveTo(x, py)
      ctx.lineTo(x + width, py)
      ctx.stroke()
    }
  },
  // Stepping stones across a shallow bed.
  ford: (ctx, zoom, span) => {
    const count = Math.max(3, Math.round((span + 10) / 9))
    const step = (span + 10) / count
    ctx.fillStyle = COLORS.fordStone
    ctx.strokeStyle = COLORS.fordStoneEdge
    ctx.lineWidth = Math.max(0.75, 1.2 * zoom)
    for (let i = 0; i < count; i++) {
      const y = (-(span + 10) / 2 + step * (i + 0.5)) * zoom
      const x = (i % 2 === 0 ? -2.5 : 2.5) * zoom
      ctx.beginPath()
      ctx.ellipse(x, y, 4.2 * zoom, 3.4 * zoom, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
    }
  },
  // A raft on a rope from bank to bank.
  ferry: (ctx, zoom, span) => {
    const length = (span + 20) * zoom
    ctx.strokeStyle = COLORS.ferryRope
    ctx.lineWidth = Math.max(1, 1.5 * zoom)
    ctx.beginPath()
    ctx.moveTo(0, -length / 2)
    ctx.lineTo(0, length / 2)
    ctx.stroke()
    ctx.fillStyle = COLORS.bridgeShadow
    ctx.fillRect(-9 * zoom + 2 * zoom, -7 * zoom + 3 * zoom, 18 * zoom, 14 * zoom)
    ctx.fillStyle = COLORS.bridgeDeck
    ctx.fillRect(-9 * zoom, -7 * zoom, 18 * zoom, 14 * zoom)
    ctx.strokeStyle = COLORS.bridgeRail
    ctx.strokeRect(-9 * zoom, -7 * zoom, 18 * zoom, 14 * zoom)
  },
}

export function drawCrossing(
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  crossing: CrossingDef,
  frame: { normal: Point; halfDepth: number },
): void {
  const c = worldToScreen(cam, crossing.point.x, crossing.point.y)
  ctx.save()
  ctx.translate(c.x, c.y)
  // The drawers draw "across" along +y; turn +y onto the water's normal.
  ctx.rotate(Math.atan2(frame.normal.y, frame.normal.x) - Math.PI / 2)
  CROSSING_DRAWERS[crossing.kind](ctx, cam.zoom, frame.halfDepth * 2)
  ctx.restore()
}

// A dashed bus line through world points (Milestone 7 bus links): blob centre
// to blob centre, via the bridge when the link crosses the river.
export function drawBusLine(
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  route: readonly Point[],
  color: string = COLORS.bus,
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
