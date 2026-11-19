import type { Ctx } from './kit'
import { PALETTE, circle, fillOutlined } from './kit'
import { SAHEL_SPECIES } from './regions/sahel'
import { EAST_ASIA_SPECIES } from './regions/eastAsia'
import { AMAZON_SKY_POSES, AMAZON_SPECIES } from './regions/amazon'

// Wildlife sprites (post-Milestone 9): one small, code-drawn animal per
// species in the journal. Each draws around a ground point (x, y) at scale s
// and takes `t` in seconds, so reduced motion freezes it like the rest of the
// living layer. The journal draws the same functions on a little canvas.

export type SpeciesSprite = (ctx: Ctx, x: number, y: number, s: number, t: number) => void

function shadow(ctx: Ctx, x: number, y: number, w: number, s: number): void {
  ctx.beginPath()
  ctx.ellipse(x, y + 0.4 * s, w * s, w * 0.35 * s, 0, 0, Math.PI * 2)
  ctx.fillStyle = PALETTE.shadow
  ctx.fill()
}

function eye(ctx: Ctx, x: number, y: number, s: number, colour = '#1d1d1b'): void {
  circle(ctx, x, y, 0.38 * s)
  ctx.fillStyle = colour
  ctx.fill()
}

// A slow amble back and forth; returns the x offset and facing.
function amble(t: number, range: number, speed: number): { dx: number; facing: number } {
  const phase = t * speed
  return { dx: Math.sin(phase) * range, facing: Math.cos(phase) >= 0 ? 1 : -1 }
}

const badger: SpeciesSprite = (ctx, x, y, s, t) => {
  const { dx, facing } = amble(t, 5 * s, 0.35)
  shadow(ctx, x + dx, y, 4.5, s)
  ctx.save()
  ctx.translate(x + dx, y)
  ctx.scale(facing, 1)
  ctx.beginPath()
  ctx.ellipse(0, -2.4 * s, 4.2 * s, 2.3 * s, 0, 0, Math.PI * 2)
  fillOutlined(ctx, '#8d8a86', s, 0.4)
  // Head: white with the black stripe.
  ctx.beginPath()
  ctx.ellipse(4 * s, -2.6 * s, 2.1 * s, 1.5 * s, 0.2, 0, Math.PI * 2)
  fillOutlined(ctx, '#f4f2ee', s, 0.4)
  ctx.beginPath()
  ctx.ellipse(4.2 * s, -2.7 * s, 1.6 * s, 0.45 * s, 0.2, 0, Math.PI * 2)
  ctx.fillStyle = '#2a2826'
  ctx.fill()
  ctx.restore()
}

const bumblebee: SpeciesSprite = (ctx, x, y, s, t) => {
  const bx = x + Math.sin(t * 1.7) * 5 * s
  const by = y - 7 * s + Math.sin(t * 3.4) * 1.5 * s
  ctx.beginPath()
  ctx.ellipse(bx, by - 1.1 * s, 1.2 * s, 0.8 * s, -0.3, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(255,255,255,0.85)'
  ctx.fill()
  ctx.beginPath()
  ctx.ellipse(bx, by, 1.6 * s, 1.15 * s, 0, 0, Math.PI * 2)
  fillOutlined(ctx, '#f2c230', s, 0.35)
  ctx.fillStyle = '#2b2622'
  ctx.fillRect(bx - 0.3 * s, by - 1.1 * s, 0.6 * s, 2.2 * s)
  ctx.beginPath()
  ctx.ellipse(bx + 1.1 * s, by, 0.5 * s, 0.9 * s, 0, 0, Math.PI * 2)
  ctx.fillStyle = '#f4f0e6'
  ctx.fill()
}

const houseSparrow: SpeciesSprite = (ctx, x, y, s, t) => {
  const hop = Math.max(0, Math.sin(t * 5)) * 1.4 * s
  const { dx, facing } = amble(t, 3 * s, 0.5)
  shadow(ctx, x + dx, y, 1.8, s)
  ctx.save()
  ctx.translate(x + dx, y - hop)
  ctx.scale(facing, 1)
  ctx.beginPath()
  ctx.ellipse(0, -1.8 * s, 2 * s, 1.5 * s, 0, 0, Math.PI * 2)
  fillOutlined(ctx, '#a07a52', s, 0.35)
  circle(ctx, 1.6 * s, -3 * s, 1.1 * s)
  fillOutlined(ctx, '#8a6a4a', s, 0.35)
  ctx.beginPath()
  ctx.moveTo(-1.8 * s, -2.2 * s)
  ctx.lineTo(-3.4 * s, -2.8 * s)
  ctx.lineTo(-3.2 * s, -1.6 * s)
  ctx.fillStyle = '#6f5338'
  ctx.fill()
  ctx.fillStyle = '#e6a33a'
  ctx.beginPath()
  ctx.moveTo(2.6 * s, -3.1 * s)
  ctx.lineTo(3.4 * s, -2.8 * s)
  ctx.lineTo(2.6 * s, -2.6 * s)
  ctx.fill()
  eye(ctx, 1.9 * s, -3.2 * s, s)
  ctx.restore()
}

const hedgehog: SpeciesSprite = (ctx, x, y, s, t) => {
  const { dx, facing } = amble(t, 4 * s, 0.3)
  shadow(ctx, x + dx, y, 3.4, s)
  ctx.save()
  ctx.translate(x + dx, y)
  ctx.scale(facing, 1)
  // Spines: a fringe of little triangles over a brown dome.
  ctx.beginPath()
  ctx.ellipse(0, -0.2 * s, 3.4 * s, 2.8 * s, 0, Math.PI, 0)
  fillOutlined(ctx, '#7a5a3c', s, 0.4)
  ctx.strokeStyle = '#4e3a28'
  ctx.lineWidth = Math.max(0.5, 0.35 * s)
  for (let i = 0; i < 6; i++) {
    const a = Math.PI + 0.35 + i * 0.45
    ctx.beginPath()
    ctx.moveTo(Math.cos(a) * 2.2 * s, -0.2 * s + Math.sin(a) * 1.8 * s)
    ctx.lineTo(Math.cos(a) * 3.6 * s, -0.2 * s + Math.sin(a) * 3 * s)
    ctx.stroke()
  }
  ctx.beginPath()
  ctx.moveTo(2.6 * s, -1.6 * s)
  ctx.quadraticCurveTo(4.8 * s, -1 * s, 4.6 * s, -0.2 * s)
  ctx.lineTo(2.4 * s, -0.2 * s)
  fillOutlined(ctx, '#d8b48a', s, 0.35)
  eye(ctx, 3.4 * s, -1.1 * s, s)
  circle(ctx, 4.6 * s, -0.4 * s, 0.35 * s)
  ctx.fillStyle = '#1d1d1b'
  ctx.fill()
  ctx.restore()
}

// A dark sickle-winged bird screaming round in fast loops.
function sickleBird(ctx: Ctx, x: number, y: number, s: number, colour: string, span: number): void {
  ctx.beginPath()
  ctx.moveTo(x - span * s, y + 0.6 * s)
  ctx.quadraticCurveTo(x - span * 0.4 * s, y - 1.4 * s, x, y)
  ctx.quadraticCurveTo(x + span * 0.4 * s, y - 1.4 * s, x + span * s, y + 0.6 * s)
  ctx.quadraticCurveTo(x + span * 0.4 * s, y - 0.4 * s, x, y + 0.6 * s)
  ctx.quadraticCurveTo(x - span * 0.4 * s, y - 0.4 * s, x - span * s, y + 0.6 * s)
  ctx.fillStyle = colour
  ctx.fill()
}

const swift: SpeciesSprite = (ctx, x, y, s, t) => {
  for (let i = 0; i < 2; i++) {
    const a = t * 1.6 + i * 2.4
    sickleBird(ctx, x + Math.cos(a) * 12 * s, y - 20 * s + Math.sin(a * 2) * 4 * s, s, '#2f3236', 3.2)
  }
}

const commonFrog: SpeciesSprite = (ctx, x, y, s, t) => {
  const cycle = (t * 0.6) % 1
  const hop = cycle < 0.18 ? Math.sin((cycle / 0.18) * Math.PI) * 2.2 * s : 0
  shadow(ctx, x, y, 2.2, s)
  ctx.save()
  ctx.translate(x, y - hop)
  ctx.beginPath()
  ctx.ellipse(0, -1.4 * s, 2.4 * s, 1.5 * s, 0, 0, Math.PI * 2)
  fillOutlined(ctx, '#6f9a3c', s, 0.4)
  for (const side of [-1, 1]) {
    circle(ctx, side * 1.1 * s, -2.7 * s, 0.75 * s)
    fillOutlined(ctx, '#7fae46', s, 0.3)
    eye(ctx, side * 1.1 * s, -2.8 * s, s)
  }
  ctx.restore()
}

const kingfisher: SpeciesSprite = (ctx, x, y, s, t) => {
  const bob = Math.sin(t * 2.2) * 0.4 * s
  // A little perch.
  ctx.strokeStyle = '#6b4f35'
  ctx.lineWidth = Math.max(0.8, 0.7 * s)
  ctx.beginPath()
  ctx.moveTo(x - 3 * s, y - 3 * s)
  ctx.lineTo(x + 3 * s, y - 3.6 * s)
  ctx.stroke()
  ctx.save()
  ctx.translate(x, y - 3.4 * s + bob)
  ctx.beginPath()
  ctx.ellipse(0, -2 * s, 1.5 * s, 2.2 * s, -0.25, 0, Math.PI * 2)
  fillOutlined(ctx, '#1f8fc2', s, 0.35)
  ctx.beginPath()
  ctx.ellipse(0.4 * s, -1.4 * s, 1 * s, 1.4 * s, -0.25, 0, Math.PI * 2)
  ctx.fillStyle = '#e8873a'
  ctx.fill()
  circle(ctx, 0.5 * s, -4.1 * s, 1.1 * s)
  fillOutlined(ctx, '#1f8fc2', s, 0.35)
  ctx.beginPath()
  ctx.moveTo(1.4 * s, -4.3 * s)
  ctx.lineTo(3.6 * s, -4 * s)
  ctx.lineTo(1.4 * s, -3.8 * s)
  ctx.fillStyle = '#2a2622'
  ctx.fill()
  eye(ctx, 0.9 * s, -4.3 * s, s)
  ctx.restore()
}

const otter: SpeciesSprite = (ctx, x, y, s, t) => {
  const a = t * 0.5
  const ox = x + Math.sin(a) * 6 * s
  const facing = Math.cos(a) >= 0 ? 1 : -1
  // Ripples where it swims.
  ctx.beginPath()
  ctx.ellipse(ox, y - 0.6 * s, 5 * s, 1.4 * s, 0, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(120, 175, 210, 0.55)'
  ctx.fill()
  ctx.save()
  ctx.translate(ox, y - 0.8 * s)
  ctx.scale(facing, 1)
  ctx.beginPath()
  ctx.ellipse(-0.6 * s, 0, 3.6 * s, 1.1 * s, 0, Math.PI, 0)
  fillOutlined(ctx, '#6b4a30', s, 0.35)
  circle(ctx, 3 * s, -1.2 * s, 1.3 * s)
  fillOutlined(ctx, '#6b4a30', s, 0.35)
  circle(ctx, 3.6 * s, -0.9 * s, 0.6 * s)
  ctx.fillStyle = '#c9a582'
  ctx.fill()
  eye(ctx, 3.2 * s, -1.6 * s, s)
  ctx.restore()
}

const skylark: SpeciesSprite = (ctx, x, y, s, t) => {
  const hover = Math.sin(t * 1.2) * 2 * s
  const flap = Math.sin(t * 14) * 1.3 * s
  const by = y - 22 * s + hover
  ctx.beginPath()
  ctx.moveTo(x - 2.6 * s, by - flap)
  ctx.quadraticCurveTo(x - 1 * s, by - 0.4 * s, x, by + 0.3 * s)
  ctx.quadraticCurveTo(x + 1 * s, by - 0.4 * s, x + 2.6 * s, by - flap)
  ctx.strokeStyle = '#8a6d4b'
  ctx.lineWidth = Math.max(0.8, 0.7 * s)
  ctx.lineCap = 'round'
  ctx.stroke()
  circle(ctx, x, by + 0.3 * s, 0.8 * s)
  ctx.fillStyle = '#9c7d58'
  ctx.fill()
  // Little song notes.
  const note = (t * 0.8) % 1
  ctx.fillStyle = `rgba(80, 70, 60, ${(0.7 * (1 - note)).toFixed(3)})`
  ctx.font = `${Math.max(6, 3 * s)}px sans-serif`
  ctx.fillText('♪', x + 2.5 * s, by - 2 * s - note * 4 * s)
}

const barnOwl: SpeciesSprite = (ctx, x, y, s, t) => {
  const a = t * 0.25
  const ox = x + Math.cos(a) * 14 * s
  const oy = y - 16 * s + Math.sin(a * 2) * 3 * s
  const flap = Math.sin(t * 3) * 0.8 * s
  ctx.beginPath()
  ctx.moveTo(ox - 5 * s, oy - flap)
  ctx.quadraticCurveTo(ox - 2 * s, oy - 2 * s, ox, oy)
  ctx.quadraticCurveTo(ox + 2 * s, oy - 2 * s, ox + 5 * s, oy - flap)
  ctx.quadraticCurveTo(ox + 2 * s, oy + 0.6 * s, ox, oy + 1 * s)
  ctx.quadraticCurveTo(ox - 2 * s, oy + 0.6 * s, ox - 5 * s, oy - flap)
  fillOutlined(ctx, '#e3c79a', s, 0.35)
  circle(ctx, ox, oy - 0.2 * s, 1.3 * s)
  fillOutlined(ctx, '#fbf6ec', s, 0.3)
  eye(ctx, ox - 0.45 * s, oy - 0.3 * s, s * 0.8)
  eye(ctx, ox + 0.45 * s, oy - 0.3 * s, s * 0.8)
}

const stagBeetle: SpeciesSprite = (ctx, x, y, s, t) => {
  const { dx, facing } = amble(t, 3 * s, 0.25)
  shadow(ctx, x + dx, y, 2.2, s)
  ctx.save()
  ctx.translate(x + dx, y)
  ctx.scale(facing, 1)
  ctx.strokeStyle = '#2a1d16'
  ctx.lineWidth = Math.max(0.5, 0.35 * s)
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath()
    ctx.moveTo(i * 1 * s, -0.8 * s)
    ctx.lineTo(i * 1.6 * s, 0.2 * s)
    ctx.stroke()
  }
  ctx.beginPath()
  ctx.ellipse(-0.4 * s, -1.2 * s, 2 * s, 1.1 * s, 0, 0, Math.PI * 2)
  fillOutlined(ctx, '#4a2e22', s, 0.35)
  // Antler-like mandibles.
  ctx.strokeStyle = '#7a3b26'
  ctx.lineWidth = Math.max(0.6, 0.45 * s)
  for (const side of [-1, 1]) {
    ctx.beginPath()
    ctx.moveTo(1.4 * s, -1.2 * s + side * 0.3 * s)
    ctx.quadraticCurveTo(3.2 * s, -1.2 * s + side * 1.4 * s, 3.4 * s, -1.2 * s + side * 0.2 * s)
    ctx.stroke()
  }
  ctx.restore()
}

const peregrine: SpeciesSprite = (ctx, x, y, s, t) => {
  const a = t * 0.45
  sickleBird(ctx, x + Math.cos(a) * 16 * s, y - 26 * s + Math.sin(a) * 5 * s, s, '#4f5862', 4.2)
}

export const SPECIES_SPRITES: Record<string, SpeciesSprite> = {
  badger,
  bumblebee,
  house_sparrow: houseSparrow,
  hedgehog,
  swift,
  common_frog: commonFrog,
  kingfisher,
  otter,
  skylark,
  barn_owl: barnOwl,
  stag_beetle: stagBeetle,
  peregrine,
  ...SAHEL_SPECIES,
  ...EAST_ASIA_SPECIES,
  ...AMAZON_SPECIES,
}

// Birds in flight are drawn well above their ground point, on a loop. For a
// still picture (the journal), each has a moment `t` where it is centred on
// its loop, `lift`: how far above the ground point it then flies, and `dx`:
// a sideways shift that centres the picture (both in units of s).
export const SKY_POSES: Readonly<Record<string, { t: number; lift: number; dx: number }>> = {
  swift: { t: Math.PI / 3.2, lift: 18, dx: 4 },
  skylark: { t: 0, lift: 21, dx: -1 },
  barn_owl: { t: Math.PI * 2, lift: 16, dx: 0 },
  peregrine: { t: Math.PI / 0.9, lift: 21, dx: 0 },
  ...AMAZON_SKY_POSES,
}

export function drawSpecies(ctx: Ctx, id: string, x: number, y: number, s: number, t: number): void {
  SPECIES_SPRITES[id]?.(ctx, x, y, s, t)
}
