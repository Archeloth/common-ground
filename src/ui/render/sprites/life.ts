import type { Ctx } from './kit'
import { PALETTE, circle, fillOutlined, roundRect } from './kit'

// The living layer (Milestone 9), drawn every frame on top of the cached
// districts: turbine blades, chimney smoke, birds, bees and butterflies, pond
// ripples, the bus, sparkles and floating labels. Everything takes `t` (seconds),
// so a reduced-motion frame can simply pass a fixed time.

export function turbineBlades(ctx: Ctx, x: number, y: number, s: number, t: number, spinning: boolean): void {
  const angle = spinning ? t * 1.8 : 0.4
  ctx.save()
  ctx.translate(x, y)
  for (let i = 0; i < 3; i++) {
    ctx.rotate((Math.PI * 2) / 3)
    ctx.save()
    ctx.rotate(angle)
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.quadraticCurveTo(1.6 * s, -5 * s, 0.4 * s, -11 * s)
    ctx.quadraticCurveTo(-0.6 * s, -5 * s, 0, 0)
    fillOutlined(ctx, '#fbfcfd', s, 0.35)
    ctx.restore()
  }
  circle(ctx, 0, 0, 1 * s)
  ctx.fillStyle = '#d9e0e5'
  ctx.fill()
  ctx.restore()
}

// Grey puffs rising from a chimney; `amount` 0..1 (dirty energy = more smoke).
export function smoke(ctx: Ctx, x: number, y: number, s: number, t: number, amount: number): void {
  if (amount <= 0.02) return
  for (let i = 0; i < 3; i++) {
    const phase = (t * 0.35 + i / 3) % 1
    const px = x + Math.sin(phase * 4 + i) * 1.5 * s + phase * 4 * s
    const py = y - phase * 14 * s
    circle(ctx, px, py, (1.4 + phase * 3) * s)
    ctx.fillStyle = `rgba(150, 146, 140, ${(0.55 * (1 - phase) * amount).toFixed(3)})`
    ctx.fill()
  }
}

// A small V-shaped bird gliding on a lazy loop around (cx, cy).
export function bird(ctx: Ctx, cx: number, cy: number, s: number, t: number, seed: number): void {
  const speed = 0.35 + (seed % 7) * 0.03
  const a = t * speed + seed
  const x = cx + Math.cos(a) * 26 * s
  const y = cy + Math.sin(a * 1.3) * 9 * s
  const flap = Math.sin(t * 9 + seed) * 1.2 * s
  ctx.beginPath()
  ctx.moveTo(x - 2.4 * s, y - flap)
  ctx.quadraticCurveTo(x - 1 * s, y - 0.4 * s, x, y + 0.4 * s)
  ctx.quadraticCurveTo(x + 1 * s, y - 0.4 * s, x + 2.4 * s, y - flap)
  ctx.strokeStyle = '#3b4a3a'
  ctx.lineWidth = Math.max(0.8, 0.55 * s)
  ctx.lineCap = 'round'
  ctx.stroke()
}

// Bees buzzing in little figure-eights over a meadow or garden.
export function bees(ctx: Ctx, x: number, y: number, s: number, t: number): void {
  for (let i = 0; i < 2; i++) {
    const a = t * (2.4 + i * 0.7) + i * 2
    const bx = x + Math.sin(a) * 6 * s
    const by = y - 6 * s + Math.sin(a * 2) * 2 * s
    ctx.beginPath()
    ctx.ellipse(bx, by, 0.9 * s, 0.65 * s, 0, 0, Math.PI * 2)
    ctx.fillStyle = PALETTE.sun
    ctx.fill()
    ctx.beginPath()
    ctx.ellipse(bx, by - 0.7 * s, 0.6 * s, 0.4 * s, 0, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(255,255,255,0.8)'
    ctx.fill()
  }
}

export function butterfly(ctx: Ctx, x: number, y: number, s: number, t: number, seed: number): void {
  const a = t * 0.9 + seed
  const bx = x + Math.sin(a) * 9 * s
  const by = y - 9 * s + Math.cos(a * 1.7) * 3 * s
  const wing = (0.5 + Math.abs(Math.sin(t * 10 + seed)) * 0.9) * s
  const colour = PALETTE.flowerColors[seed % PALETTE.flowerColors.length]
  ctx.fillStyle = colour
  ctx.beginPath()
  ctx.ellipse(bx - wing * 0.7, by, wing, 1.1 * s, 0, 0, Math.PI * 2)
  ctx.ellipse(bx + wing * 0.7, by, wing, 1.1 * s, 0, 0, Math.PI * 2)
  ctx.fill()
}

export function ripple(ctx: Ctx, x: number, y: number, s: number, t: number): void {
  const phase = (t * 0.5) % 1
  ctx.beginPath()
  ctx.ellipse(x - 1 * s, y - 2.6 * s, (1 + phase * 5) * s, (0.4 + phase * 1.8) * s, 0, 0, Math.PI * 2)
  ctx.strokeStyle = `rgba(255,255,255,${(0.7 * (1 - phase)).toFixed(3)})`
  ctx.lineWidth = Math.max(0.5, 0.4 * s)
  ctx.stroke()
}

// A friendly little bus; `facing` is 1 (right) or -1 (left).
export function bus(ctx: Ctx, x: number, y: number, s: number, facing: number, t: number): void {
  const bob = Math.sin(t * 12) * 0.25 * s
  ctx.save()
  ctx.translate(x, y + bob)
  ctx.scale(facing, 1)
  ctx.beginPath()
  ctx.ellipse(0, 3.2 * s, 6 * s, 1.2 * s, 0, 0, Math.PI * 2)
  ctx.fillStyle = PALETTE.shadow
  ctx.fill()
  roundRect(ctx, -6 * s, -2.8 * s, 12 * s, 5.6 * s, 1.6 * s)
  fillOutlined(ctx, '#f2c94c', s, 0.5)
  roundRect(ctx, -6 * s, 0.6 * s, 12 * s, 1 * s, 0.4 * s)
  ctx.fillStyle = '#5fae5a'
  ctx.fill()
  for (let i = 0; i < 3; i++) {
    roundRect(ctx, -4.8 * s + i * 3.2 * s, -1.9 * s, 2.4 * s, 1.9 * s, 0.4 * s)
    ctx.fillStyle = PALETTE.window
    ctx.fill()
  }
  roundRect(ctx, 4.4 * s, -1.9 * s, 1.2 * s, 2.6 * s, 0.4 * s)
  ctx.fillStyle = PALETTE.window
  ctx.fill()
  ctx.fillStyle = '#3d3a3a'
  circle(ctx, -3.6 * s, 2.8 * s, 1.1 * s)
  ctx.fill()
  circle(ctx, 3.6 * s, 2.8 * s, 1.1 * s)
  ctx.fill()
  ctx.restore()
}

// Sparkles around a project as it pops in; progress 0..1.
export function sparkles(ctx: Ctx, x: number, y: number, s: number, progress: number): void {
  const alpha = 1 - progress
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + progress
    const d = (6 + progress * 10) * s
    const px = x + Math.cos(a) * d
    const py = y - 5 * s + Math.sin(a) * d * 0.6
    const r = (1.6 - progress) * s
    ctx.save()
    ctx.translate(px, py)
    ctx.rotate(progress * 3)
    ctx.beginPath()
    for (let k = 0; k < 4; k++) {
      ctx.rotate(Math.PI / 2)
      ctx.lineTo(0, -r * 1.8)
      ctx.lineTo(r * 0.45, -r * 0.45)
    }
    ctx.closePath()
    ctx.fillStyle = `rgba(255, 214, 90, ${alpha.toFixed(3)})`
    ctx.fill()
    ctx.restore()
  }
}

// "+12% Food" rising from a district; progress 0..1.
export function floatingLabel(ctx: Ctx, x: number, y: number, text: string, colour: string, progress: number): void {
  const eased = 1 - (1 - progress) ** 2
  const alpha = progress < 0.75 ? 1 : 1 - (progress - 0.75) / 0.25
  ctx.save()
  ctx.globalAlpha = Math.max(0, alpha)
  ctx.font = '700 13px ui-rounded, "SF Pro Rounded", Nunito, system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const ty = y - eased * 34
  const width = ctx.measureText(text).width
  // A soft white pill, a dot in the need's colour, and the text in ink.
  ctx.fillStyle = 'rgba(255,255,255,0.92)'
  ctx.beginPath()
  ctx.roundRect(x - width / 2 - 16, ty - 10, width + 26, 20, 10)
  ctx.fill()
  ctx.fillStyle = colour
  ctx.beginPath()
  ctx.arc(x - width / 2 - 6, ty, 4, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#26321f'
  ctx.fillText(text, x + 4, ty)
  ctx.restore()
}

// A district's own value of a need ("72%" over a small bar), shown while
// the player hovers that need in the Town overview. Text is ink; the colour
// only fills the bar.
export function valuePill(ctx: Ctx, x: number, y: number, value: number, colour: string): void {
  const text = `${Math.round(value * 100)}%`
  ctx.save()
  ctx.font = '700 12px ui-rounded, "SF Pro Rounded", Nunito, system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const w = Math.max(44, ctx.measureText(text).width + 18)
  const h = 26
  ctx.shadowColor = 'rgba(31, 43, 28, 0.22)'
  ctx.shadowBlur = 6
  ctx.shadowOffsetY = 1
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.roundRect(x - w / 2, y - h / 2, w, h, 8)
  ctx.fill()
  ctx.shadowColor = 'transparent'
  ctx.fillStyle = '#26321f'
  ctx.fillText(text, x, y - 3)
  const barW = w - 14
  ctx.fillStyle = '#e1e0d9'
  ctx.beginPath()
  ctx.roundRect(x - barW / 2, y + 6, barW, 3.5, 2)
  ctx.fill()
  ctx.fillStyle = colour
  ctx.beginPath()
  ctx.roundRect(x - barW / 2, y + 6, Math.max(3.5, barW * Math.min(1, Math.max(0, value))), 3.5, 2)
  ctx.fill()
  ctx.restore()
}

// Ease-out-back: overshoots a little, then settles (the "pop" of a new project).
export function popScale(progress: number): number {
  const c1 = 1.70158
  const c3 = c1 + 1
  const p = Math.min(1, Math.max(0, progress))
  return 1 + c3 * (p - 1) ** 3 + c1 * (p - 1) ** 2
}
