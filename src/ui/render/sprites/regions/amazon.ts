import type { Ctx } from '../kit'
import { PALETTE, ROOFS, WALLS, circle, fillOutlined, groundShadow, mix, pick, roundRect } from '../kit'
import type { Plot } from '../../scene/layout'
import type { Overlays } from '../buildings'
import type { SpeciesSprite } from '../wildlife'

// The Amazon river town (Milestone 10 preview): brightly painted wooden
// houses, houses on stilts above the flood line, thatched huts in the
// forest, kapok giants, açaí palms and manioc gardens. Drawn around a ground
// point (x, y) at scale s, in the theme's palette.

function kitOnRoof(ctx: Ctx, x: number, y: number, w: number, s: number): void {
  roundRect(ctx, x, y, w, 1.5 * s, 0.3 * s)
  ctx.fillStyle = PALETTE.panel
  ctx.fill()
  ctx.strokeStyle = PALETTE.panelShine
  ctx.lineWidth = Math.max(0.3, 0.3 * s)
  ctx.stroke()
}

function planks(ctx: Ctx, left: number, top: number, w: number, h: number, s: number): void {
  ctx.strokeStyle = 'rgba(40, 30, 20, 0.18)'
  ctx.lineWidth = Math.max(0.3, 0.3 * s)
  for (let py = top + 1.4 * s; py < top + h; py += 1.4 * s) {
    ctx.beginPath()
    ctx.moveTo(left, py)
    ctx.lineTo(left + w, py)
    ctx.stroke()
  }
}

function gableRoof(ctx: Ctx, left: number, top: number, w: number, s: number, colour: string, rise = 4.6): void {
  ctx.beginPath()
  ctx.moveTo(left - 1.4 * s, top + 0.8 * s)
  ctx.lineTo(left + w / 2, top - rise * s)
  ctx.lineTo(left + w + 1.4 * s, top + 0.8 * s)
  ctx.closePath()
  fillOutlined(ctx, colour, s)
  // Corrugations on a zinc roof.
  ctx.strokeStyle = 'rgba(255,255,255,0.25)'
  ctx.lineWidth = Math.max(0.3, 0.25 * s)
  for (let i = 1; i < 6; i++) {
    const bx = left - 1.4 * s + ((w + 2.8 * s) * i) / 6
    ctx.beginPath()
    ctx.moveTo(bx, top + 0.8 * s)
    ctx.lineTo(left + w / 2 + (bx - left - w / 2) * 0.15, top - rise * s * 0.85)
    ctx.stroke()
  }
}

// A wooden house raised on stilts above the high-water line, with steps.
export function stilt(ctx: Ctx, b: Plot, x: number, y: number, s: number, o: Overlays): void {
  const w = 11 * s
  const h = 6.5 * s
  const lift = 4.5 * s
  const left = x - w / 2
  const top = y - lift - h
  groundShadow(ctx, x, y, 16, s)
  ctx.strokeStyle = mix(PALETTE.trunk, '#2a1c12', 0.2)
  ctx.lineWidth = Math.max(0.7, 0.9 * s)
  for (const px of [left + 1 * s, x, left + w - 1 * s]) {
    ctx.beginPath()
    ctx.moveTo(px, y)
    ctx.lineTo(px, y - lift)
    ctx.stroke()
  }
  roundRect(ctx, left - 1 * s, y - lift - 0.8 * s, w + 2 * s, 1 * s, 0.3 * s)
  fillOutlined(ctx, '#8a6a48', s, 0.3)
  roundRect(ctx, left, top, w, h, 0.5 * s)
  fillOutlined(ctx, pick(WALLS, (b.variant * 7) % 1), s)
  planks(ctx, left, top, w, h, s)
  roundRect(ctx, left + 1.4 * s, top + 1.6 * s, 2.6 * s, 2.2 * s, 0.3 * s)
  ctx.fillStyle = o.retrofit ? PALETTE.windowWarm : '#3a3430'
  ctx.fill()
  roundRect(ctx, left + w - 4 * s, top + 1.2 * s, 2.4 * s, h - 1.2 * s, 0.3 * s)
  ctx.fillStyle = PALETTE.door
  ctx.fill()
  ctx.strokeStyle = '#8a6a48'
  ctx.lineWidth = Math.max(0.5, 0.6 * s)
  for (let i = 0; i < 3; i++) {
    ctx.beginPath()
    ctx.moveTo(left + w + 0.6 * s + i * 0.9 * s, y - lift + i * 1.5 * s)
    ctx.lineTo(left + w + 2 * s + i * 0.9 * s, y - lift + i * 1.5 * s)
    ctx.stroke()
  }
  gableRoof(ctx, left, top, w, s, o.retrofit ? PALETTE.roofCosy : pick(ROOFS, b.variant))
  if (o.solar) kitOnRoof(ctx, x - 1 * s, top - 3.4 * s, 4 * s, s)
}

// A forest hut: low walls of palm wood under a deep thatched roof.
export function thatchHut(ctx: Ctx, b: Plot, x: number, y: number, s: number, o: Overlays): void {
  const w = 11 * s
  const h = 4.6 * s
  const left = x - w / 2
  const top = y - h
  groundShadow(ctx, x, y, 16, s)
  roundRect(ctx, left, top, w, h, 0.4 * s)
  fillOutlined(ctx, mix(PALETTE.trunk, '#d9b88a', 0.35), s)
  roundRect(ctx, x - 1.4 * s, y - 3.6 * s, 2.8 * s, 3.6 * s, 0.3 * s)
  ctx.fillStyle = '#3a3026'
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(left - 2.4 * s, top + 1.6 * s)
  ctx.quadraticCurveTo(x, top - 9 * s, left + w + 2.4 * s, top + 1.6 * s)
  ctx.closePath()
  fillOutlined(ctx, o.retrofit ? '#c9a66a' : pick(['#b0905a', '#a5864f', '#bb9a62'], b.variant), s)
  ctx.strokeStyle = 'rgba(90, 70, 40, 0.45)'
  ctx.lineWidth = Math.max(0.3, 0.3 * s)
  for (let i = 1; i < 7; i++) {
    const bx = left - 2.4 * s + ((w + 4.8 * s) * i) / 7
    ctx.beginPath()
    ctx.moveTo(bx, top + 1.4 * s)
    ctx.lineTo(x + (bx - x) * 0.6, top - 3 * s)
    ctx.stroke()
  }
  if (o.solar) kitOnRoof(ctx, x + 0.6 * s, top - 3.6 * s, 3.6 * s, s)
}

// A painted wooden town house with a front porch and a zinc gable roof.
export function paintedHouse(ctx: Ctx, b: Plot, x: number, y: number, s: number, o: Overlays): void {
  const w = 11 * s
  const h = 8 * s
  const left = x - w / 2
  const top = y - h
  groundShadow(ctx, x, y, 16, s)
  roundRect(ctx, left, top, w, h, 0.5 * s)
  const wall = pick(WALLS, (b.variant * 5) % 1)
  fillOutlined(ctx, wall, s)
  planks(ctx, left, top, w, h, s)
  // A contrasting trim around the windows: the town's painted look.
  const trim = pick(WALLS, (b.variant * 5 + 0.4) % 1)
  for (const wx of [left + 1.4 * s, left + w - 4 * s]) {
    roundRect(ctx, wx - 0.4 * s, top + 1.2 * s, 3.4 * s, 3 * s, 0.4 * s)
    ctx.fillStyle = trim
    ctx.fill()
    roundRect(ctx, wx, top + 1.6 * s, 2.6 * s, 2.2 * s, 0.3 * s)
    ctx.fillStyle = o.retrofit ? PALETTE.windowWarm : PALETTE.window
    ctx.fill()
  }
  roundRect(ctx, x - 1.3 * s, y - 4 * s, 2.6 * s, 4 * s, 0.3 * s)
  ctx.fillStyle = PALETTE.door
  ctx.fill()
  gableRoof(ctx, left, top, w, s, o.retrofit ? PALETTE.roofCosy : pick(ROOFS, b.variant), 5)
  if (o.solar) kitOnRoof(ctx, x + 0.4 * s, top - 3.6 * s, 4 * s, s)
}

// --- plants -----------------------------------------------------------------------

// A kapok: a tall pale trunk on buttress roots, a wide umbrella crown.
export function kapok(ctx: Ctx, x: number, y: number, s: number, variant: number): void {
  const tall = (15 + variant * 4) * s
  groundShadow(ctx, x, y, 16, s)
  ctx.beginPath()
  ctx.moveTo(x - 4 * s, y)
  ctx.quadraticCurveTo(x - 1.4 * s, y - 2 * s, x - 1 * s, y - tall)
  ctx.lineTo(x + 1 * s, y - tall)
  ctx.quadraticCurveTo(x + 1.4 * s, y - 2 * s, x + 4 * s, y)
  ctx.closePath()
  fillOutlined(ctx, '#b9b09e', s, 0.4)
  ctx.beginPath()
  ctx.ellipse(x - 3 * s, y - tall - 0.6 * s, 4 * s, 2.2 * s, 0, 0, Math.PI * 2)
  ctx.ellipse(x + 3.4 * s, y - tall - 0.4 * s, 4.2 * s, 2.2 * s, 0, 0, Math.PI * 2)
  ctx.ellipse(x, y - tall - 2.4 * s, 5 * s, 2.6 * s, 0, 0, Math.PI * 2)
  fillOutlined(ctx, pick([PALETTE.leaf, PALETTE.leafDark], variant), s, 0.4)
  ctx.beginPath()
  ctx.ellipse(x - 1.4 * s, y - tall - 3.4 * s, 2.4 * s, 0.9 * s, 0, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(255,255,255,0.2)'
  ctx.fill()
}

// A clump of açaí palms: several slender stems with small feathery crowns.
export function acai(ctx: Ctx, x: number, y: number, s: number, variant: number): void {
  groundShadow(ctx, x, y, 8, s)
  ctx.lineCap = 'round'
  for (let i = 0; i < 3; i++) {
    const lean = (i - 1) * 1.6 * s
    const tall = (12 + ((i * 3 + variant * 6) % 4)) * s
    const tx = x + lean * 1.8
    const ty = y - tall
    ctx.beginPath()
    ctx.moveTo(x + (i - 1) * 0.8 * s, y)
    ctx.lineTo(tx, ty)
    ctx.strokeStyle = '#7a6a52'
    ctx.lineWidth = Math.max(0.5, 0.6 * s)
    ctx.stroke()
    for (let f = -2; f <= 2; f++) {
      ctx.beginPath()
      ctx.moveTo(tx, ty)
      ctx.quadraticCurveTo(tx + f * 1.4 * s, ty - 2 * s, tx + f * 2.6 * s, ty + 0.8 * s + Math.abs(f) * 0.6 * s)
      ctx.strokeStyle = f % 2 === 0 ? PALETTE.leafDark : PALETTE.leaf
      ctx.lineWidth = Math.max(0.6, 0.8 * s)
      ctx.stroke()
    }
    if (variant > 0.3) {
      circle(ctx, tx + 0.4 * s, ty + 1.2 * s, 0.7 * s)
      ctx.fillStyle = '#3d2547'
      ctx.fill()
    }
  }
}

// A manioc (cassava) garden: rows of leafy stems on cleared earth.
export function manioc(ctx: Ctx, x: number, y: number, s: number, variant: number): void {
  const w = 22 * s
  const h = 8 * s
  roundRect(ctx, x - w / 2, y - h, w, h, 2 * s)
  ctx.fillStyle = mix(PALETTE.soil, '#8a5a3a', 0.2)
  ctx.fill()
  ctx.strokeStyle = PALETTE.outline
  ctx.lineWidth = Math.max(0.5, 0.4 * s)
  ctx.stroke()
  for (let row = 0; row < 2; row++) {
    for (let i = 0; i < 6; i++) {
      const px = x - w / 2 + (2.4 + i * 3.4 + (row % 2) * 1.6) * s
      const py = y - h + (3.4 + row * 3) * s
      ctx.strokeStyle = '#8a5a5a'
      ctx.lineWidth = Math.max(0.4, 0.4 * s)
      ctx.beginPath()
      ctx.moveTo(px, py)
      ctx.lineTo(px, py - 2.4 * s)
      ctx.stroke()
      for (let l = 0; l < 5; l++) {
        const a = -Math.PI / 2 + (l - 2) * 0.55
        ctx.beginPath()
        ctx.ellipse(px + Math.cos(a) * 1.2 * s, py - 2.4 * s + Math.sin(a) * 1.2 * s, 1 * s, 0.35 * s, a, 0, Math.PI * 2)
        ctx.fillStyle = l % 2 === 0 ? PALETTE.leaf : PALETTE.leafLight
        ctx.fill()
      }
    }
  }
  void variant
}

// --- project scenes -------------------------------------------------------------------

// An agroforest plot: young fruit trees, palms and manioc planted together.
function agroforest(ctx: Ctx, x: number, y: number, s: number): void {
  groundShadow(ctx, x, y, 22, s)
  manioc(ctx, x - 2 * s, y, s * 0.6, 0.2)
  acai(ctx, x + 7 * s, y, s * 0.7, 0.5)
  for (const dx of [-8, -4]) {
    ctx.strokeStyle = PALETTE.trunk
    ctx.lineWidth = Math.max(0.5, 0.6 * s)
    ctx.beginPath()
    ctx.moveTo(x + dx * s, y)
    ctx.lineTo(x + dx * s, y - 4 * s)
    ctx.stroke()
    circle(ctx, x + dx * s, y - 5 * s, 2 * s)
    fillOutlined(ctx, PALETTE.leafLight, s, 0.3)
    circle(ctx, x + dx * s + 0.6 * s, y - 4.6 * s, 0.5 * s)
    ctx.fillStyle = '#f2a33a'
    ctx.fill()
  }
}

// A forest management camp: a tarp shelter and a map board on posts.
function forestCamp(ctx: Ctx, x: number, y: number, s: number): void {
  groundShadow(ctx, x, y, 20, s)
  ctx.beginPath()
  ctx.moveTo(x - 9 * s, y)
  ctx.lineTo(x - 4 * s, y - 6 * s)
  ctx.lineTo(x + 1 * s, y)
  ctx.closePath()
  fillOutlined(ctx, '#3f7fa0', s, 0.4)
  ctx.strokeStyle = PALETTE.trunk
  ctx.lineWidth = Math.max(0.5, 0.6 * s)
  ctx.beginPath()
  ctx.moveTo(x + 4 * s, y)
  ctx.lineTo(x + 4 * s, y - 6 * s)
  ctx.moveTo(x + 9 * s, y)
  ctx.lineTo(x + 9 * s, y - 6 * s)
  ctx.stroke()
  roundRect(ctx, x + 3 * s, y - 10 * s, 7 * s, 5 * s, 0.4 * s)
  fillOutlined(ctx, '#f2ead6', s, 0.4)
  ctx.beginPath()
  ctx.moveTo(x + 4 * s, y - 7 * s)
  ctx.quadraticCurveTo(x + 6 * s, y - 9.4 * s, x + 9 * s, y - 8 * s)
  ctx.strokeStyle = '#5f9ad6'
  ctx.lineWidth = Math.max(0.4, 0.4 * s)
  ctx.stroke()
  for (const [dx, dy] of [
    [5, -8.6],
    [7.6, -6.4],
  ]) {
    circle(ctx, x + dx * s, y + dy * s, 0.8 * s)
    ctx.fillStyle = PALETTE.leaf
    ctx.fill()
  }
}

// Baskets of açaí berries and a sack of Brazil nuts at the co-op's stall.
function acaiCoop(ctx: Ctx, x: number, y: number, s: number): void {
  groundShadow(ctx, x, y, 20, s)
  roundRect(ctx, x - 9 * s, y - 5 * s, 18 * s, 1 * s, 0.4 * s)
  fillOutlined(ctx, '#8a6a48', s, 0.3)
  for (let i = 0; i < 3; i++) {
    const bx = x - 7 * s + i * 5 * s
    ctx.beginPath()
    ctx.moveTo(bx - 2 * s, y - 5 * s)
    ctx.lineTo(bx - 1.4 * s, y - 9 * s)
    ctx.lineTo(bx + 1.4 * s, y - 9 * s)
    ctx.lineTo(bx + 2 * s, y - 5 * s)
    ctx.closePath()
    fillOutlined(ctx, '#c49a6c', s, 0.4)
    for (let k = 0; k < 4; k++) {
      circle(ctx, bx - 1 * s + (k % 2) * 1.6 * s + (k > 1 ? 0.8 : 0) * s, y - 9.2 * s - (k > 1 ? 0.8 : 0) * s, 0.7 * s)
      ctx.fillStyle = '#3d2547'
      ctx.fill()
    }
  }
  ctx.beginPath()
  ctx.ellipse(x + 7 * s, y - 2 * s, 2.4 * s, 2.2 * s, 0, 0, Math.PI * 2)
  fillOutlined(ctx, '#c9b48a', s, 0.4)
  for (let k = 0; k < 3; k++) {
    ctx.beginPath()
    ctx.ellipse(x + 6.2 * s + k * 0.9 * s, y - 4.2 * s, 0.6 * s, 0.4 * s, 0.4, 0, Math.PI * 2)
    ctx.fillStyle = '#6e4a2e'
    ctx.fill()
  }
}

// An extractive reserve: a boundary sign and a rubber tree with a tapping cup.
function reserveMarker(ctx: Ctx, x: number, y: number, s: number): void {
  groundShadow(ctx, x, y, 18, s)
  ctx.strokeStyle = PALETTE.trunk
  ctx.lineWidth = Math.max(0.6, 0.8 * s)
  ctx.beginPath()
  ctx.moveTo(x - 6 * s, y)
  ctx.lineTo(x - 6 * s, y - 8 * s)
  ctx.stroke()
  roundRect(ctx, x - 10 * s, y - 12 * s, 8 * s, 4.4 * s, 0.4 * s)
  fillOutlined(ctx, '#2f7a4a', s, 0.4)
  roundRect(ctx, x - 9 * s, y - 11 * s, 6 * s, 0.8 * s, 0.3 * s)
  ctx.fillStyle = '#f2ead6'
  ctx.fill()
  roundRect(ctx, x - 9 * s, y - 9.6 * s, 4 * s, 0.6 * s, 0.3 * s)
  ctx.fill()
  roundRect(ctx, x + 3 * s, y - 13 * s, 2.4 * s, 13 * s, 0.8 * s)
  fillOutlined(ctx, '#a8a090', s, 0.4)
  ctx.strokeStyle = '#6e6658'
  ctx.lineWidth = Math.max(0.3, 0.3 * s)
  for (let i = 0; i < 3; i++) {
    ctx.beginPath()
    ctx.moveTo(x + 3 * s, y - (5 + i * 1.6) * s)
    ctx.lineTo(x + 5.4 * s, y - (6 + i * 1.6) * s)
    ctx.stroke()
  }
  roundRect(ctx, x + 5.2 * s, y - 5 * s, 1.6 * s, 1.4 * s, 0.4 * s)
  fillOutlined(ctx, '#f2f0ea', s, 0.3)
  circle(ctx, x + 4.2 * s, y - 15 * s, 3.4 * s)
  fillOutlined(ctx, PALETTE.leaf, s, 0.4)
}

// A lookout and a phone on a pole: the monitoring team's base.
function watchtower(ctx: Ctx, x: number, y: number, s: number): void {
  groundShadow(ctx, x, y, 14, s)
  ctx.strokeStyle = '#8a6a48'
  ctx.lineWidth = Math.max(0.6, 0.8 * s)
  ctx.beginPath()
  ctx.moveTo(x - 4 * s, y)
  ctx.lineTo(x - 2.4 * s, y - 13 * s)
  ctx.moveTo(x + 4 * s, y)
  ctx.lineTo(x + 2.4 * s, y - 13 * s)
  ctx.moveTo(x - 3.4 * s, y - 4 * s)
  ctx.lineTo(x + 3.4 * s, y - 4 * s)
  ctx.moveTo(x - 3 * s, y - 8 * s)
  ctx.lineTo(x + 3 * s, y - 8 * s)
  ctx.stroke()
  roundRect(ctx, x - 4 * s, y - 15 * s, 8 * s, 2.4 * s, 0.4 * s)
  fillOutlined(ctx, '#a5864f', s, 0.4)
  ctx.beginPath()
  ctx.moveTo(x - 5 * s, y - 15 * s)
  ctx.lineTo(x, y - 18 * s)
  ctx.lineTo(x + 5 * s, y - 15 * s)
  ctx.closePath()
  fillOutlined(ctx, '#b0905a', s, 0.4)
  circle(ctx, x + 6 * s, y - 9 * s, 0.6 * s)
  ctx.fillStyle = '#d9533a'
  ctx.fill()
}

// A school and ambulance boat tied up at a little wooden dock.
function boatDock(ctx: Ctx, x: number, y: number, s: number): void {
  groundShadow(ctx, x, y, 22, s)
  roundRect(ctx, x - 11 * s, y - 3 * s, 22 * s, 3 * s, 1 * s)
  ctx.fillStyle = mix(PALETTE.water, '#6a8a6a', 0.3)
  ctx.fill()
  roundRect(ctx, x - 11 * s, y - 5 * s, 7 * s, 1.4 * s, 0.3 * s)
  fillOutlined(ctx, '#8a6a48', s, 0.3)
  ctx.beginPath()
  ctx.moveTo(x - 3 * s, y - 4.6 * s)
  ctx.lineTo(x + 10 * s, y - 4.6 * s)
  ctx.quadraticCurveTo(x + 9 * s, y - 2 * s, x + 7 * s, y - 2 * s)
  ctx.lineTo(x - 1.6 * s, y - 2 * s)
  ctx.closePath()
  fillOutlined(ctx, '#f2f0ea', s, 0.4)
  roundRect(ctx, x - 0.6 * s, y - 8.4 * s, 8 * s, 3.8 * s, 0.6 * s)
  fillOutlined(ctx, '#f2c94c', s, 0.4)
  roundRect(ctx, x + 0.4 * s, y - 7.6 * s, 1.6 * s, 1.4 * s, 0.3 * s)
  ctx.fillStyle = PALETTE.window
  ctx.fill()
  // A red cross: it is also the river ambulance.
  ctx.fillStyle = '#d9533a'
  ctx.fillRect(x + 4.6 * s, y - 7.8 * s, 0.7 * s, 2.2 * s)
  ctx.fillRect(x + 3.85 * s, y - 7.05 * s, 2.2 * s, 0.7 * s)
}

// A solar home kit: a panel on a pole and a small battery box.
function homeSolar(ctx: Ctx, x: number, y: number, s: number): void {
  groundShadow(ctx, x, y, 14, s)
  ctx.strokeStyle = '#8b8f94'
  ctx.lineWidth = Math.max(0.6, 0.7 * s)
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(x, y - 8 * s)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(x - 4.6 * s, y - 8 * s)
  ctx.lineTo(x - 3.2 * s, y - 12.4 * s)
  ctx.lineTo(x + 4.6 * s, y - 12.4 * s)
  ctx.lineTo(x + 3.2 * s, y - 8 * s)
  ctx.closePath()
  fillOutlined(ctx, PALETTE.panel, s, 0.4)
  roundRect(ctx, x + 2 * s, y - 3 * s, 4 * s, 3 * s, 0.4 * s)
  fillOutlined(ctx, '#3e3a38', s, 0.3)
  circle(ctx, x + 4 * s, y - 1.5 * s, 0.5 * s)
  ctx.fillStyle = '#6aa84a'
  ctx.fill()
  circle(ctx, x - 6 * s, y - 6 * s, 1.4 * s)
  ctx.fillStyle = PALETTE.windowWarm
  ctx.fill()
}

// A rainwater tank on a raised stand, fed by a gutter.
function rainTank(ctx: Ctx, x: number, y: number, s: number): void {
  groundShadow(ctx, x, y, 14, s)
  ctx.strokeStyle = '#8a6a48'
  ctx.lineWidth = Math.max(0.6, 0.7 * s)
  ctx.beginPath()
  ctx.moveTo(x - 4 * s, y)
  ctx.lineTo(x - 4 * s, y - 4 * s)
  ctx.moveTo(x + 4 * s, y)
  ctx.lineTo(x + 4 * s, y - 4 * s)
  ctx.stroke()
  roundRect(ctx, x - 5 * s, y - 4.6 * s, 10 * s, 1 * s, 0.3 * s)
  fillOutlined(ctx, '#8a6a48', s, 0.3)
  roundRect(ctx, x - 4.4 * s, y - 11 * s, 8.8 * s, 6.6 * s, 2 * s)
  fillOutlined(ctx, '#3f7fa0', s, 0.5)
  ctx.strokeStyle = 'rgba(255,255,255,0.3)'
  ctx.lineWidth = Math.max(0.3, 0.3 * s)
  for (let i = 1; i < 4; i++) {
    ctx.beginPath()
    ctx.moveTo(x - 4.4 * s, y - 11 * s + i * 1.6 * s)
    ctx.lineTo(x + 4.4 * s, y - 11 * s + i * 1.6 * s)
    ctx.stroke()
  }
  ctx.strokeStyle = '#8b8f94'
  ctx.lineWidth = Math.max(0.5, 0.6 * s)
  ctx.beginPath()
  ctx.moveTo(x + 9 * s, y - 13 * s)
  ctx.lineTo(x + 2 * s, y - 13 * s)
  ctx.lineTo(x + 2 * s, y - 11 * s)
  ctx.stroke()
}

// A floating garden: a raft of planted beds riding on the water.
function floatingGarden(ctx: Ctx, x: number, y: number, s: number): void {
  groundShadow(ctx, x, y, 22, s)
  roundRect(ctx, x - 11 * s, y - 2.4 * s, 22 * s, 2.4 * s, 1 * s)
  ctx.fillStyle = mix(PALETTE.water, '#6a8a6a', 0.3)
  ctx.fill()
  roundRect(ctx, x - 8 * s, y - 4.4 * s, 16 * s, 2.6 * s, 0.6 * s)
  fillOutlined(ctx, '#a5864f', s, 0.4)
  roundRect(ctx, x - 7.2 * s, y - 5.6 * s, 14.4 * s, 1.6 * s, 0.6 * s)
  ctx.fillStyle = PALETTE.soil
  ctx.fill()
  for (let i = 0; i < 6; i++) {
    circle(ctx, x - 6 * s + i * 2.4 * s, y - 6.2 * s, 1 * s)
    ctx.fillStyle = i % 2 === 0 ? PALETTE.leafLight : PALETTE.leaf
    ctx.fill()
  }
  circle(ctx, x + 2 * s, y - 6.8 * s, 0.6 * s)
  ctx.fillStyle = '#d9533a'
  ctx.fill()
}

// A budget assembly: benches in a circle under a shelter, a ballot box.
function assembly(ctx: Ctx, x: number, y: number, s: number): void {
  groundShadow(ctx, x, y, 22, s)
  ctx.strokeStyle = '#8a6a48'
  ctx.lineWidth = Math.max(0.6, 0.7 * s)
  ctx.beginPath()
  ctx.moveTo(x - 8 * s, y)
  ctx.lineTo(x - 8 * s, y - 7 * s)
  ctx.moveTo(x + 8 * s, y)
  ctx.lineTo(x + 8 * s, y - 7 * s)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(x - 10 * s, y - 7 * s)
  ctx.lineTo(x, y - 11 * s)
  ctx.lineTo(x + 10 * s, y - 7 * s)
  ctx.closePath()
  fillOutlined(ctx, pick(ROOFS, 0.4), s, 0.5)
  const people = ['#d9533a', '#5f9ad6', '#f2c94c', '#6aa84a', '#c48bb9']
  people.forEach((c, i) => {
    const a = (i / people.length) * Math.PI * 2
    const px = x + Math.cos(a) * 5 * s
    const py = y - 2.4 * s + Math.sin(a) * 1.6 * s
    roundRect(ctx, px - 0.8 * s, py - 2.6 * s, 1.6 * s, 2.6 * s, 0.6 * s)
    ctx.fillStyle = c
    ctx.fill()
    circle(ctx, px, py - 3.2 * s, 0.7 * s)
    ctx.fillStyle = '#8a5a3c'
    ctx.fill()
  })
  roundRect(ctx, x - 1 * s, y - 3 * s, 2 * s, 2 * s, 0.3 * s)
  fillOutlined(ctx, '#f2f0ea', s, 0.3)
}

export const AMAZON_DECORATIONS = {
  agroforest,
  forestCamp,
  acaiCoop,
  reserveMarker,
  watchtower,
  boatDock,
  homeSolar,
  rainTank,
  floatingGarden,
  assembly,
}

// --- wildlife ---------------------------------------------------------------------------

// A scarlet macaw flying a wide loop above the canopy.
const scarletMacaw: SpeciesSprite = (ctx, x, y, s, t) => {
  const a = t * 0.5
  const bx = x + Math.cos(a) * 14 * s
  const by = y - 22 * s + Math.sin(a) * 4 * s
  const flap = Math.sin(t * 7) * 2.6 * s
  const facing = -Math.sin(a) >= 0 ? 1 : -1
  ctx.save()
  ctx.translate(bx, by)
  ctx.scale(facing, 1)
  ctx.beginPath()
  ctx.moveTo(-1 * s, 0)
  ctx.lineTo(-6 * s, -flap - 1 * s)
  ctx.lineTo(-3 * s, 0.6 * s)
  ctx.closePath()
  ctx.fillStyle = '#2f6fd0'
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(1 * s, 0)
  ctx.lineTo(4 * s, flap - 1 * s)
  ctx.lineTo(2.6 * s, 0.8 * s)
  ctx.closePath()
  ctx.fillStyle = '#f2c230'
  ctx.fill()
  ctx.beginPath()
  ctx.ellipse(0, 0, 3 * s, 1.1 * s, 0, 0, Math.PI * 2)
  fillOutlined(ctx, '#d9332a', s, 0.3)
  ctx.beginPath()
  ctx.moveTo(-2.6 * s, 0.2 * s)
  ctx.lineTo(-8 * s, 1.4 * s)
  ctx.lineTo(-2.4 * s, 0.9 * s)
  ctx.closePath()
  ctx.fillStyle = '#d9332a'
  ctx.fill()
  circle(ctx, 3 * s, -0.4 * s, 0.9 * s)
  ctx.fillStyle = '#f2ead6'
  ctx.fill()
  ctx.restore()
}

// An Amazon river dolphin (boto): pink, surfacing in a slow arc.
const riverDolphin: SpeciesSprite = (ctx, x, y, s, t) => {
  const phase = (t * 0.6) % (Math.PI * 2)
  const up = Math.max(0, Math.sin(phase))
  ctx.beginPath()
  ctx.ellipse(x, y - 0.6 * s, 6 * s, 1.4 * s, 0, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(160, 200, 220, 0.6)'
  ctx.fill()
  if (up < 0.05) return
  ctx.save()
  ctx.beginPath()
  ctx.rect(x - 8 * s, y - 12 * s, 16 * s, 11.4 * s)
  ctx.clip()
  ctx.beginPath()
  ctx.ellipse(x, y - 1 * s + (1 - up) * 4 * s, 5 * s, 2.6 * s * up, 0, Math.PI, 0)
  fillOutlined(ctx, '#e9a0a8', s, 0.4)
  ctx.beginPath()
  ctx.moveTo(x - 0.6 * s, y - 1 * s - 2.4 * s * up)
  ctx.lineTo(x + 0.6 * s, y - 1 * s - 3.4 * s * up)
  ctx.lineTo(x + 1.6 * s, y - 1 * s - 2.2 * s * up)
  ctx.closePath()
  ctx.fillStyle = '#d98890'
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(x + 4.6 * s, y - 1.4 * s)
  ctx.lineTo(x + 7 * s, y - 1 * s - 0.6 * s * up)
  ctx.strokeStyle = '#d98890'
  ctx.lineWidth = Math.max(0.6, 0.8 * s)
  ctx.stroke()
  ctx.restore()
}

export const AMAZON_SPECIES: Record<string, SpeciesSprite> = { scarlet_macaw: scarletMacaw, amazon_river_dolphin: riverDolphin }
export const AMAZON_SKY_POSES = { scarlet_macaw: { t: Math.PI / 1, lift: 22, dx: 14 } }
