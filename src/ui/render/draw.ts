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

// The river runs as a wide, gently curving stroke across the world. Drawn as a
// stroked quadratic curve so it reads as water, not a stripe (placeholder art).
export function drawRiver(
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  leftWorld: number,
  rightWorld: number,
  riverY: number,
  halfDepth: number,
): void {
  const start = worldToScreen(cam, leftWorld, riverY)
  const end = worldToScreen(cam, rightWorld, riverY)
  const mid = worldToScreen(cam, (leftWorld + rightWorld) / 2, riverY + halfDepth * 0.25)

  ctx.beginPath()
  ctx.moveTo(start.x, start.y)
  ctx.quadraticCurveTo(mid.x, mid.y, end.x, end.y)
  ctx.strokeStyle = COLORS.river
  ctx.lineWidth = halfDepth * 2 * cam.zoom
  ctx.lineCap = 'round'
  ctx.stroke()
}
