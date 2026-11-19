import type { Ctx } from './kit'
import { PALETTE, circle, fillOutlined, groundShadow, mix, pick } from './kit'
import { drawGreenery } from './buildings'
import { snowOnPath, snowing } from '../scene/season'
import type { WildItem } from '../scene/wilds'
import { ripple } from './life'

// Countryside sprites (post-Milestone 9): bushes, grass, wild flowers, rocks
// and lily pads, plus the animated fish and ducks in the river. Trees,
// conifers and reeds reuse the district greenery. Colours come from PALETTE,
// so the seasons repaint the countryside like the town.

function bush(ctx: Ctx, x: number, y: number, s: number, variant: number): void {
  groundShadow(ctx, x, y, 9, s)
  const w = (3.4 + variant * 1.4) * s
  ctx.beginPath()
  ctx.arc(x - w * 0.55, y - 2.6 * s, w * 0.7, Math.PI * 0.5, Math.PI * 1.6)
  ctx.arc(x, y - 4.2 * s, w * 0.8, Math.PI * 1.05, Math.PI * 1.95)
  ctx.arc(x + w * 0.55, y - 2.6 * s, w * 0.7, Math.PI * 1.4, Math.PI * 0.5)
  ctx.closePath()
  fillOutlined(ctx, variant > 0.5 ? PALETTE.leafDark : PALETTE.leaf, s, 0.45)
  snowOnPath(ctx, y - 8 * s, y - 4.4 * s)
  if (!snowing() && variant > 0.72) {
    // A few berries on some bushes.
    ctx.fillStyle = '#d2534a'
    for (let i = 0; i < 3; i++) {
      circle(ctx, x + (i - 1) * 1.6 * s, y - (2.6 + (i % 2) * 1.4) * s, 0.45 * s)
      ctx.fill()
    }
  }
}

function tuft(ctx: Ctx, x: number, y: number, s: number, variant: number): void {
  ctx.lineCap = 'round'
  ctx.strokeStyle = snowing() ? '#c9cfc6' : mix(PALETTE.leafDark, '#56703f', 0.4)
  ctx.lineWidth = Math.max(0.6, 0.5 * s)
  for (let i = -1; i <= 1; i++) {
    const lean = (i + (variant - 0.5)) * 1.3 * s
    ctx.beginPath()
    ctx.moveTo(x + i * 0.8 * s, y)
    ctx.quadraticCurveTo(x + i * 0.8 * s, y - 2.4 * s, x + i * 0.8 * s + lean, y - (3.6 + Math.abs(i) * -0.8) * s)
    ctx.stroke()
  }
}

function flowers(ctx: Ctx, x: number, y: number, s: number, variant: number, life: number): void {
  tuft(ctx, x, y, s, variant)
  if (life < 0.5) return
  const colour = pick(PALETTE.flowerColors, variant)
  for (let i = 0; i < 3; i++) {
    const fx = x + (i - 1) * 1.5 * s
    const fy = y - (3 + ((i + Math.floor(variant * 3)) % 2) * 1.2) * s
    circle(ctx, fx, fy, 0.75 * s)
    ctx.fillStyle = colour
    ctx.fill()
    circle(ctx, fx, fy, 0.28 * s)
    ctx.fillStyle = '#f7d046'
    ctx.fill()
  }
}

function rock(ctx: Ctx, x: number, y: number, s: number, variant: number): void {
  groundShadow(ctx, x, y, 7, s)
  ctx.beginPath()
  ctx.moveTo(x - 3 * s, y)
  ctx.quadraticCurveTo(x - 3.2 * s, y - 2.6 * s, x - 0.6 * s, y - 3.2 * s)
  ctx.quadraticCurveTo(x + 2.6 * s, y - 3 * s, x + 3 * s, y)
  ctx.closePath()
  fillOutlined(ctx, variant > 0.5 ? '#a9a59b' : '#bab4a6', s, 0.45)
  snowOnPath(ctx, y - 3.4 * s, y - 2 * s)
}

function lilypad(ctx: Ctx, x: number, y: number, s: number, variant: number, life: number): void {
  const r = (1.8 + variant * 0.8) * s
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.ellipse(x, y, r, r * 0.55, 0, 0.35, Math.PI * 2 - 0.1)
  ctx.closePath()
  ctx.fillStyle = mix(PALETTE.leaf, PALETTE.lilypadShade, 0.4)
  ctx.fill()
  if (life >= 1 && variant > 0.55) {
    circle(ctx, x + r * 0.2, y - 0.6 * s, 0.7 * s)
    ctx.fillStyle = '#f6d3e4'
    ctx.fill()
  }
}

export function drawWild(ctx: Ctx, item: WildItem, x: number, y: number, s: number, life: number): void {
  ctx.save()
  switch (item.style) {
    case 'tree':
    case 'conifer':
    case 'reeds':
      drawGreenery(ctx, { ...item, style: item.style }, x, y, s)
      break
    case 'bush':
      bush(ctx, x, y, s, item.variant)
      break
    case 'tuft':
      tuft(ctx, x, y, s, item.variant)
      break
    case 'flowers':
      flowers(ctx, x, y, s, item.variant, life)
      break
    case 'rock':
      rock(ctx, x, y, s, item.variant)
      break
    case 'lilypad':
      lilypad(ctx, x, y, s, item.variant, life)
      break
  }
  ctx.restore()
}

// A fish now and then leaps out of the water in a little arc, with a ripple
// where it went in. `seed` staggers the fish so they never jump together.
export function leapingFish(ctx: Ctx, x: number, y: number, s: number, t: number, seed: number): void {
  const cycle = 7 + (seed % 3)
  const phase = ((t + seed * 3.1) % cycle) / cycle
  const leap = 0.12 // share of the cycle spent in the air
  if (phase < leap) {
    const k = phase / leap
    const fx = x + (k - 0.5) * 9 * s
    const fy = y - Math.sin(k * Math.PI) * 6 * s
    ctx.save()
    ctx.translate(fx, fy)
    ctx.rotate((k - 0.5) * 1.6)
    ctx.beginPath()
    ctx.ellipse(0, 0, 2.2 * s, 0.9 * s, 0, 0, Math.PI * 2)
    ctx.fillStyle = '#c7d3da'
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(-1.8 * s, 0)
    ctx.lineTo(-3.2 * s, -0.9 * s)
    ctx.lineTo(-3.2 * s, 0.9 * s)
    ctx.closePath()
    ctx.fillStyle = '#9fb2bd'
    ctx.fill()
    ctx.restore()
  } else if (phase < leap + 0.22) {
    // The splash spreads out where the fish went back in.
    ripple(ctx, x + 4.5 * s, y + 2.6 * s, s, (phase - leap) / 0.22 / 0.5)
  }
}

// A duck paddling along, with a small V of wake behind it.
export function duck(ctx: Ctx, x: number, y: number, s: number, facing: number, t: number, drake: boolean): void {
  const bob = Math.sin(t * 2.5) * 0.25 * s
  ctx.save()
  ctx.translate(x, y + bob)
  ctx.scale(facing, 1)
  ctx.strokeStyle = 'rgba(255,255,255,0.55)'
  ctx.lineWidth = Math.max(0.5, 0.35 * s)
  ctx.beginPath()
  ctx.moveTo(-2.6 * s, 0.2 * s)
  ctx.lineTo(-6 * s, -0.8 * s)
  ctx.moveTo(-2.6 * s, 0.4 * s)
  ctx.lineTo(-6 * s, 1.4 * s)
  ctx.stroke()
  ctx.beginPath()
  ctx.ellipse(0, -0.6 * s, 2.8 * s, 1.3 * s, 0, 0, Math.PI * 2)
  fillOutlined(ctx, drake ? '#d9d2c4' : '#a9845c', s, 0.35)
  circle(ctx, 2.2 * s, -2.2 * s, 1.05 * s)
  fillOutlined(ctx, drake ? '#2f7a4f' : '#8f6c48', s, 0.35)
  ctx.beginPath()
  ctx.moveTo(3.1 * s, -2.2 * s)
  ctx.lineTo(4.4 * s, -1.9 * s)
  ctx.lineTo(3.1 * s, -1.7 * s)
  ctx.fillStyle = '#e8a63a'
  ctx.fill()
  ctx.restore()
}
