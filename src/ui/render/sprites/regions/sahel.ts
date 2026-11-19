import type { Ctx } from '../kit'
import { PALETTE, WALLS, circle, fillOutlined, groundShadow, mix, pick, roundRect } from '../kit'
import type { Plot } from '../../scene/layout'
import type { Overlays } from '../buildings'
import type { SpeciesSprite } from '../wildlife'

// The Sahel oasis village (Milestone 10 preview): flat-roofed earth houses
// with parapets, a ksar tower, herders' tents, date palms, flat-topped
// acacias and millet. Drawn like every other sprite, around a ground point
// (x, y) at scale s, in the theme's palette.

function smallPanel(ctx: Ctx, x: number, y: number, w: number, s: number): void {
  roundRect(ctx, x, y, w, 1.6 * s, 0.3 * s)
  ctx.fillStyle = PALETTE.panel
  ctx.fill()
  ctx.strokeStyle = PALETTE.panelShine
  ctx.lineWidth = Math.max(0.4, 0.3 * s)
  ctx.stroke()
}

function darkWindow(ctx: Ctx, x: number, y: number, w: number, h: number, s: number, warm: boolean): void {
  roundRect(ctx, x, y, w, h, 0.4 * s)
  ctx.fillStyle = warm ? PALETTE.windowWarm : '#5b4636'
  ctx.fill()
}

// A flat-roofed earth house with a parapet, small deep windows and an
// arched door. Retrofitted homes get a shade awning.
export function mudhouse(ctx: Ctx, b: Plot, x: number, y: number, s: number, o: Overlays): void {
  const w = (11 + b.variant * 3) * s
  const h = (7 + ((b.variant * 5) % 1) * 2) * s
  const left = x - w / 2
  const top = y - h
  const wall = pick(WALLS, (b.variant * 7) % 1)
  groundShadow(ctx, x, y, 16, s)
  roundRect(ctx, left, top, w, h, 0.8 * s)
  fillOutlined(ctx, wall, s)
  // Parapet: a slightly darker band with little steps at the corners.
  const lip = mix(wall, '#7a5a3a', 0.18)
  roundRect(ctx, left - 0.4 * s, top - 1.4 * s, w + 0.8 * s, 1.8 * s, 0.4 * s)
  fillOutlined(ctx, lip, s, 0.4)
  for (const cx of [left + 0.2 * s, left + w - 1.8 * s]) {
    roundRect(ctx, cx, top - 2.6 * s, 1.6 * s, 1.4 * s, 0.3 * s)
    fillOutlined(ctx, lip, s, 0.3)
  }
  if (o.solar) smallPanel(ctx, left + w * 0.25, top - 3.2 * s, w * 0.45, s)
  darkWindow(ctx, left + 1.6 * s, top + 1.8 * s, 1.8 * s, 1.8 * s, s, o.retrofit)
  darkWindow(ctx, left + w - 3.4 * s, top + 1.8 * s, 1.8 * s, 1.8 * s, s, o.retrofit)
  ctx.beginPath()
  ctx.moveTo(x - 1.4 * s, y)
  ctx.lineTo(x - 1.4 * s, y - 3.4 * s)
  ctx.arc(x, y - 3.4 * s, 1.4 * s, Math.PI, 0)
  ctx.lineTo(x + 1.4 * s, y)
  ctx.closePath()
  ctx.fillStyle = PALETTE.door
  ctx.fill()
  if (o.retrofit) {
    // A shade awning over the door: cooler rooms behind it.
    ctx.beginPath()
    ctx.moveTo(x - 4 * s, y - 5.4 * s)
    ctx.lineTo(x + 4 * s, y - 5.4 * s)
    ctx.lineTo(x + 5 * s, y - 3.6 * s)
    ctx.lineTo(x - 5 * s, y - 3.6 * s)
    ctx.closePath()
    fillOutlined(ctx, PALETTE.awningCream, s, 0.4)
  }
}

// A tapering earthen tower with a crenellated top and slit windows.
export function ksarTower(ctx: Ctx, b: Plot, x: number, y: number, s: number, o: Overlays): void {
  const base = 8 * s
  const topW = 6 * s
  const h = (16 + b.variant * 3) * s
  const wall = mix(pick(WALLS, b.variant), '#b07a4a', 0.25)
  groundShadow(ctx, x, y, 12, s)
  ctx.beginPath()
  ctx.moveTo(x - base / 2, y)
  ctx.lineTo(x - topW / 2, y - h)
  ctx.lineTo(x + topW / 2, y - h)
  ctx.lineTo(x + base / 2, y)
  ctx.closePath()
  fillOutlined(ctx, wall, s)
  for (let i = 0; i < 3; i++) {
    roundRect(ctx, x - topW / 2 + i * (topW / 2.5), y - h - 1.6 * s, topW / 4, 1.8 * s, 0.3 * s)
    fillOutlined(ctx, wall, s, 0.3)
  }
  // Rows of little triangular vents, a common motif on earthen towers.
  ctx.fillStyle = mix(wall, '#3a2a1f', 0.45)
  for (let row = 0; row < 2; row++) {
    for (let i = -1; i <= 1; i++) {
      const vx = x + i * 1.6 * s
      const vy = y - h + (3 + row * 2.4) * s
      ctx.beginPath()
      ctx.moveTo(vx - 0.5 * s, vy + 0.8 * s)
      ctx.lineTo(vx, vy)
      ctx.lineTo(vx + 0.5 * s, vy + 0.8 * s)
      ctx.closePath()
      ctx.fill()
    }
  }
  darkWindow(ctx, x - 0.5 * s, y - h * 0.45, 1 * s, 2.6 * s, s, o.retrofit)
  roundRect(ctx, x - 1.2 * s, y - 3.6 * s, 2.4 * s, 3.6 * s, 1 * s)
  ctx.fillStyle = PALETTE.door
  ctx.fill()
}

// A herders' tent: a low woven roof on poles, striped.
export function tent(ctx: Ctx, b: Plot, x: number, y: number, s: number, o: Overlays): void {
  const w = 14 * s
  const h = 5.5 * s
  groundShadow(ctx, x, y, 18, s)
  ctx.beginPath()
  ctx.moveTo(x - w / 2, y)
  ctx.quadraticCurveTo(x - w / 2 + 1 * s, y - h, x, y - h - 0.6 * s)
  ctx.quadraticCurveTo(x + w / 2 - 1 * s, y - h, x + w / 2, y)
  ctx.closePath()
  fillOutlined(ctx, pick(['#6b4a35', '#7d5a3e', '#5c4a3c'], b.variant), s)
  ctx.save()
  ctx.clip()
  ctx.strokeStyle = 'rgba(240, 225, 195, 0.55)'
  ctx.lineWidth = Math.max(0.6, 0.7 * s)
  for (let i = 1; i < 4; i++) {
    ctx.beginPath()
    ctx.moveTo(x - w / 2, y - i * 1.5 * s)
    ctx.lineTo(x + w / 2, y - i * 1.5 * s)
    ctx.stroke()
  }
  ctx.restore()
  roundRect(ctx, x - 2 * s, y - 3 * s, 4 * s, 3 * s, 0.4 * s)
  ctx.fillStyle = '#2f2219'
  ctx.fill()
  if (o.solar) smallPanel(ctx, x + w / 2 - 1 * s, y - 2.4 * s, 4 * s, s)
}

// --- plants -----------------------------------------------------------------------

// A date palm: a curved, ringed trunk and a crown of drooping fronds.
export function palm(ctx: Ctx, x: number, y: number, s: number, variant: number): void {
  const tall = (11 + variant * 4) * s
  const lean = (variant - 0.5) * 3 * s
  groundShadow(ctx, x, y, 8, s)
  ctx.beginPath()
  ctx.moveTo(x - 0.9 * s, y)
  ctx.quadraticCurveTo(x - 0.6 * s + lean * 0.3, y - tall * 0.5, x + lean - 0.5 * s, y - tall)
  ctx.lineTo(x + lean + 0.5 * s, y - tall)
  ctx.quadraticCurveTo(x + 0.6 * s + lean * 0.3, y - tall * 0.5, x + 0.9 * s, y)
  ctx.closePath()
  fillOutlined(ctx, PALETTE.trunk, s, 0.4)
  ctx.strokeStyle = mix(PALETTE.trunk, '#2a1c12', 0.3)
  ctx.lineWidth = Math.max(0.4, 0.3 * s)
  for (let i = 1; i < 6; i++) {
    const k = i / 6
    const cx = x + lean * k * k
    ctx.beginPath()
    ctx.moveTo(cx - 0.8 * s, y - tall * k)
    ctx.lineTo(cx + 0.8 * s, y - tall * k + 0.4 * s)
    ctx.stroke()
  }
  const top = { x: x + lean, y: y - tall }
  const fronds = [-2.6, -1.6, -0.6, 0.6, 1.6, 2.6, 0]
  fronds.forEach((a, i) => {
    const len = (6 + (i % 2) * 1.5) * s
    const ex = top.x + Math.sin(a * 0.55) * len
    const ey = top.y - Math.cos(a * 0.55) * len * 0.45 + Math.abs(a) * 1.2 * s
    ctx.beginPath()
    ctx.moveTo(top.x, top.y)
    ctx.quadraticCurveTo((top.x + ex) / 2, top.y - 2.2 * s, ex, ey)
    ctx.strokeStyle = i % 2 === 0 ? PALETTE.leafDark : PALETTE.leaf
    ctx.lineWidth = Math.max(0.9, 1.5 * s)
    ctx.lineCap = 'round'
    ctx.stroke()
  })
  if (variant > 0.4) {
    circle(ctx, top.x + 0.6 * s, top.y + 1.4 * s, 0.9 * s)
    ctx.fillStyle = '#c8772e'
    ctx.fill()
  }
}

// A flat-topped acacia: a thin forked trunk and a wide, flat crown.
export function acacia(ctx: Ctx, x: number, y: number, s: number, variant: number): void {
  const h = (7 + variant * 2) * s
  groundShadow(ctx, x, y, 12, s)
  ctx.strokeStyle = PALETTE.trunk
  ctx.lineCap = 'round'
  ctx.lineWidth = Math.max(0.8, 1.1 * s)
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(x, y - h * 0.55)
  ctx.lineTo(x - 2.4 * s, y - h)
  ctx.moveTo(x, y - h * 0.55)
  ctx.lineTo(x + 2.8 * s, y - h)
  ctx.stroke()
  ctx.beginPath()
  ctx.ellipse(x, y - h - 0.6 * s, (6.5 + variant * 2) * s, 1.9 * s, 0, 0, Math.PI * 2)
  fillOutlined(ctx, pick([PALETTE.leaf, PALETTE.leafDark], variant), s, 0.4)
  ctx.beginPath()
  ctx.ellipse(x - 1.2 * s, y - h - 1.4 * s, 3 * s, 0.8 * s, 0, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(255,255,255,0.18)'
  ctx.fill()
}

// A millet plot: rows of upright stalks with seed heads on sandy soil.
export function millet(ctx: Ctx, x: number, y: number, s: number, variant: number): void {
  const w = 22 * s
  const h = 8 * s
  roundRect(ctx, x - w / 2, y - h, w, h, 2 * s)
  ctx.fillStyle = mix(PALETTE.soil, '#e2c48e', 0.55)
  ctx.fill()
  ctx.strokeStyle = PALETTE.outline
  ctx.lineWidth = Math.max(0.5, 0.4 * s)
  ctx.stroke()
  ctx.lineCap = 'round'
  for (let row = 0; row < 3; row++) {
    for (let i = 0; i < 7; i++) {
      const sx = x - w / 2 + (2 + i * 3 + (row % 2) * 1.4) * s
      const sy = y - h + (2.6 + row * 2.4) * s
      ctx.beginPath()
      ctx.moveTo(sx, sy)
      ctx.lineTo(sx, sy - (3 + variant) * s)
      ctx.strokeStyle = PALETTE.crop
      ctx.lineWidth = Math.max(0.5, 0.5 * s)
      ctx.stroke()
      ctx.beginPath()
      ctx.ellipse(sx, sy - (3.4 + variant) * s, 0.45 * s, 1 * s, 0, 0, Math.PI * 2)
      ctx.fillStyle = PALETTE.wheat
      ctx.fill()
    }
  }
}

// --- project scenes -------------------------------------------------------------------

// A foggara: a line of well shafts (soil rings) over an underground channel
// that surfaces into a stone-lined runnel.
function channel(ctx: Ctx, x: number, y: number, s: number): void {
  groundShadow(ctx, x, y, 22, s)
  for (let i = 0; i < 3; i++) {
    const wx = x - 8 * s + i * 5 * s
    const wy = y - 6 * s + i * 0.6 * s
    ctx.beginPath()
    ctx.ellipse(wx, wy, 2 * s, 0.9 * s, 0, 0, Math.PI * 2)
    fillOutlined(ctx, mix(PALETTE.soil, '#e2c48e', 0.4), s, 0.4)
    ctx.beginPath()
    ctx.ellipse(wx, wy, 0.9 * s, 0.4 * s, 0, 0, Math.PI * 2)
    ctx.fillStyle = '#3a2a1f'
    ctx.fill()
  }
  roundRect(ctx, x - 2 * s, y - 2.6 * s, 13 * s, 2.6 * s, 1 * s)
  fillOutlined(ctx, '#b9b2a3', s, 0.4)
  roundRect(ctx, x - 1.2 * s, y - 2 * s, 11.4 * s, 1.4 * s, 0.7 * s)
  ctx.fillStyle = PALETTE.water
  ctx.fill()
}

// A round, white-plastered rainwater cistern with a domed lid and a gutter.
function cistern(ctx: Ctx, x: number, y: number, s: number): void {
  groundShadow(ctx, x, y, 14, s)
  roundRect(ctx, x - 5 * s, y - 6 * s, 10 * s, 6 * s, 1.4 * s)
  fillOutlined(ctx, '#f1ece2', s)
  ctx.beginPath()
  ctx.ellipse(x, y - 6 * s, 5 * s, 2.4 * s, 0, Math.PI, 0)
  fillOutlined(ctx, '#e6ddcd', s, 0.5)
  roundRect(ctx, x - 0.8 * s, y - 8.8 * s, 1.6 * s, 1.2 * s, 0.4 * s)
  fillOutlined(ctx, '#9aa6b5', s, 0.3)
  ctx.strokeStyle = '#8b8f94'
  ctx.lineWidth = Math.max(0.6, 0.7 * s)
  ctx.beginPath()
  ctx.moveTo(x + 5 * s, y - 4 * s)
  ctx.lineTo(x + 8 * s, y - 4 * s)
  ctx.lineTo(x + 8 * s, y - 11 * s)
  ctx.stroke()
  roundRect(ctx, x - 3 * s, y - 3 * s, 6 * s, 1 * s, 0.4 * s)
  ctx.fillStyle = PALETTE.water
  ctx.fill()
}

// A solar panel on a pole driving a pump into a raised tank.
function solarPump(ctx: Ctx, x: number, y: number, s: number): void {
  groundShadow(ctx, x, y, 18, s)
  ctx.strokeStyle = '#8b8f94'
  ctx.lineWidth = Math.max(0.6, 0.8 * s)
  ctx.beginPath()
  ctx.moveTo(x - 5 * s, y)
  ctx.lineTo(x - 5 * s, y - 7 * s)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(x - 9.5 * s, y - 7 * s)
  ctx.lineTo(x - 8 * s, y - 11.5 * s)
  ctx.lineTo(x - 1 * s, y - 11.5 * s)
  ctx.lineTo(x - 2.5 * s, y - 7 * s)
  ctx.closePath()
  fillOutlined(ctx, PALETTE.panel, s, 0.4)
  for (const dx of [3, 7]) {
    ctx.beginPath()
    ctx.moveTo(x + dx * s, y)
    ctx.lineTo(x + dx * s, y - 6 * s)
    ctx.stroke()
  }
  roundRect(ctx, x + 1.6 * s, y - 10.5 * s, 7 * s, 4.6 * s, 1 * s)
  fillOutlined(ctx, '#5f9ad6', s, 0.5)
  ctx.beginPath()
  ctx.moveTo(x - 5 * s, y - 1 * s)
  ctx.lineTo(x + 1.6 * s, y - 1 * s)
  ctx.lineTo(x + 1.6 * s, y - 6 * s)
  ctx.stroke()
  circle(ctx, x - 5 * s, y - 13.5 * s, 1.2 * s)
  ctx.fillStyle = PALETTE.sun
  ctx.fill()
}

// Zaï pits and half-moons: crescent earth bunds catching rain, seedlings
// growing in their shelter.
function halfMoons(ctx: Ctx, x: number, y: number, s: number): void {
  groundShadow(ctx, x, y, 22, s)
  const spots = [
    [-6, -1.5],
    [2, -1],
    [-2, -5],
    [6, -4.6],
  ]
  for (const [dx, dy] of spots) {
    const cx = x + dx * s
    const cy = y + dy * s
    ctx.beginPath()
    ctx.ellipse(cx, cy, 3.2 * s, 1.6 * s, 0, 0, Math.PI)
    ctx.lineWidth = Math.max(0.9, 1.3 * s)
    ctx.strokeStyle = mix(PALETTE.soil, '#e2c48e', 0.3)
    ctx.stroke()
    ctx.beginPath()
    ctx.ellipse(cx, cy - 0.6 * s, 1.4 * s, 0.6 * s, 0, 0, Math.PI * 2)
    ctx.fillStyle = mix(PALETTE.soil, '#3a2a1f', 0.25)
    ctx.fill()
    for (const lx of [-0.6, 0.6]) {
      ctx.beginPath()
      ctx.ellipse(cx + lx * s, cy - 1.6 * s, 0.6 * s, 1.1 * s, lx, 0, Math.PI * 2)
      ctx.fillStyle = PALETTE.leafLight
      ctx.fill()
    }
  }
}

// Young trees regrowing from old stumps, each in a protective stone ring.
function saplings(ctx: Ctx, x: number, y: number, s: number): void {
  groundShadow(ctx, x, y, 20, s)
  for (const [dx, dy, k] of [
    [-5, -1, 1],
    [4, -0.5, 0.85],
    [0, -5, 0.75],
  ]) {
    const cx = x + dx * s
    const cy = y + dy * s
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2
      circle(ctx, cx + Math.cos(a) * 2.2 * s, cy + Math.sin(a) * 0.9 * s, 0.6 * s)
      ctx.fillStyle = '#b9b2a3'
      ctx.fill()
    }
    acacia(ctx, cx, cy, s * 0.55 * k, 0.3)
  }
}

// A layered oasis garden: a palm over beds of vegetables and fruit trees.
function oasisGarden(ctx: Ctx, x: number, y: number, s: number): void {
  groundShadow(ctx, x, y, 20, s)
  for (const dx of [-5, 3]) {
    roundRect(ctx, x + dx * s - 3.4 * s, y - 3.6 * s, 6.8 * s, 3.6 * s, 1 * s)
    fillOutlined(ctx, PALETTE.soil, s, 0.4)
    for (let i = 0; i < 3; i++) {
      circle(ctx, x + dx * s - 2 * s + i * 2 * s, y - 2.2 * s, 0.9 * s)
      ctx.fillStyle = i % 2 === 0 ? PALETTE.leafLight : PALETTE.leaf
      ctx.fill()
    }
  }
  roundRect(ctx, x - 9 * s, y - 0.8 * s, 18 * s, 0.8 * s, 0.4 * s)
  ctx.fillStyle = PALETTE.water
  ctx.fill()
  palm(ctx, x + 7 * s, y - 1 * s, s * 0.8, 0.6)
}

// Compressed earth blocks drying beside a small vaulted roof.
function earthHouse(ctx: Ctx, x: number, y: number, s: number): void {
  groundShadow(ctx, x, y, 20, s)
  const wall = pick(WALLS, 0.3)
  roundRect(ctx, x - 7 * s, y - 6 * s, 10 * s, 6 * s, 0.6 * s)
  fillOutlined(ctx, wall, s)
  ctx.beginPath()
  ctx.moveTo(x - 7 * s, y - 6 * s)
  ctx.quadraticCurveTo(x - 2 * s, y - 11 * s, x + 3 * s, y - 6 * s)
  ctx.closePath()
  fillOutlined(ctx, mix(wall, '#7a5a3a', 0.15), s)
  for (let row = 0; row < 3; row++) {
    for (let i = 0; i < 3 - row; i++) {
      roundRect(ctx, x + 4.5 * s + i * 2.6 * s + row * 1.3 * s, y - (row + 1) * 1.6 * s, 2.4 * s, 1.5 * s, 0.2 * s)
      fillOutlined(ctx, mix(wall, '#9a6b47', 0.3), s, 0.3)
    }
  }
}

// A windcatcher tower with vents at the top, and a shade sail beside it.
function windcatcher(ctx: Ctx, x: number, y: number, s: number): void {
  groundShadow(ctx, x, y, 18, s)
  const wall = mix(pick(WALLS, 0.6), '#b07a4a', 0.15)
  roundRect(ctx, x - 7 * s, y - 13 * s, 5 * s, 13 * s, 0.6 * s)
  fillOutlined(ctx, wall, s)
  for (let i = 0; i < 2; i++) {
    roundRect(ctx, x - 6.2 * s + i * 2 * s, y - 12 * s, 1.2 * s, 3 * s, 0.3 * s)
    ctx.fillStyle = '#3a2a1f'
    ctx.fill()
  }
  ctx.strokeStyle = PALETTE.trunk
  ctx.lineWidth = Math.max(0.5, 0.6 * s)
  ctx.beginPath()
  ctx.moveTo(x + 1 * s, y)
  ctx.lineTo(x + 1 * s, y - 7 * s)
  ctx.moveTo(x + 9 * s, y)
  ctx.lineTo(x + 9 * s, y - 6 * s)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(x + 0.4 * s, y - 7.4 * s)
  ctx.lineTo(x + 9.6 * s, y - 6.4 * s)
  ctx.lineTo(x + 8 * s, y - 4.4 * s)
  ctx.lineTo(x + 1.6 * s, y - 5 * s)
  ctx.closePath()
  fillOutlined(ctx, PALETTE.awningCream, s, 0.4)
}

// A clay cookstove with a pot: less smoke, less wood.
function cookstove(ctx: Ctx, x: number, y: number, s: number): void {
  groundShadow(ctx, x, y, 12, s)
  ctx.beginPath()
  ctx.moveTo(x - 4 * s, y)
  ctx.lineTo(x - 3 * s, y - 5 * s)
  ctx.lineTo(x + 3 * s, y - 5 * s)
  ctx.lineTo(x + 4 * s, y)
  ctx.closePath()
  fillOutlined(ctx, '#b0683f', s)
  ctx.beginPath()
  ctx.arc(x, y - 0.4 * s, 1.4 * s, Math.PI, 0)
  ctx.fillStyle = '#f2a03d'
  ctx.fill()
  ctx.beginPath()
  ctx.ellipse(x, y - 6.6 * s, 3.4 * s, 2 * s, 0, 0, Math.PI * 2)
  fillOutlined(ctx, '#4a4440', s, 0.4)
  ctx.beginPath()
  ctx.moveTo(x - 1 * s, y - 9 * s)
  ctx.quadraticCurveTo(x - 2 * s, y - 11 * s, x - 0.5 * s, y - 12.5 * s)
  ctx.strokeStyle = 'rgba(255,255,255,0.6)'
  ctx.lineWidth = Math.max(0.6, 0.6 * s)
  ctx.stroke()
}

// Garden beds with black drip lines and a small header tank.
function dripLines(ctx: Ctx, x: number, y: number, s: number): void {
  groundShadow(ctx, x, y, 20, s)
  roundRect(ctx, x - 9 * s, y - 6 * s, 14 * s, 6 * s, 1 * s)
  fillOutlined(ctx, PALETTE.soil, s, 0.4)
  for (let row = 0; row < 3; row++) {
    const ry = y - 5 * s + row * 1.9 * s
    ctx.beginPath()
    ctx.moveTo(x - 8.4 * s, ry)
    ctx.lineTo(x + 4.4 * s, ry)
    ctx.strokeStyle = '#2b2a28'
    ctx.lineWidth = Math.max(0.4, 0.35 * s)
    ctx.stroke()
    for (let i = 0; i < 5; i++) {
      circle(ctx, x - 7.4 * s + i * 2.8 * s, ry - 0.5 * s, 0.8 * s)
      ctx.fillStyle = i % 2 === 0 ? PALETTE.leaf : PALETTE.leafLight
      ctx.fill()
    }
  }
  roundRect(ctx, x + 6 * s, y - 8 * s, 4 * s, 5 * s, 0.8 * s)
  fillOutlined(ctx, '#5f9ad6', s, 0.4)
  ctx.strokeStyle = '#8b8f94'
  ctx.lineWidth = Math.max(0.5, 0.6 * s)
  ctx.beginPath()
  ctx.moveTo(x + 6.6 * s, y - 3 * s)
  ctx.lineTo(x + 6.6 * s, y)
  ctx.moveTo(x + 9.4 * s, y - 3 * s)
  ctx.lineTo(x + 9.4 * s, y)
  ctx.stroke()
}

// A row of ground-mounted panels and a battery hut: the village power plant.
function minigrid(ctx: Ctx, x: number, y: number, s: number): void {
  groundShadow(ctx, x, y, 24, s)
  for (let i = 0; i < 3; i++) {
    const px = x - 10 * s + i * 5.4 * s
    ctx.beginPath()
    ctx.moveTo(px, y - 1.5 * s)
    ctx.lineTo(px + 1.2 * s, y - 5.5 * s)
    ctx.lineTo(px + 5.6 * s, y - 5.5 * s)
    ctx.lineTo(px + 4.4 * s, y - 1.5 * s)
    ctx.closePath()
    fillOutlined(ctx, PALETTE.panel, s, 0.4)
  }
  roundRect(ctx, x + 6.4 * s, y - 6 * s, 6 * s, 6 * s, 0.6 * s)
  fillOutlined(ctx, pick(WALLS, 0.1), s)
  ctx.beginPath()
  ctx.moveTo(x + 9.6 * s, y - 4.8 * s)
  ctx.lineTo(x + 8.6 * s, y - 2.8 * s)
  ctx.lineTo(x + 9.8 * s, y - 2.8 * s)
  ctx.lineTo(x + 8.8 * s, y - 0.8 * s)
  ctx.strokeStyle = '#f2b830'
  ctx.lineWidth = Math.max(0.6, 0.6 * s)
  ctx.stroke()
  circle(ctx, x - 2 * s, y - 10 * s, 1.5 * s)
  ctx.fillStyle = PALETTE.sun
  ctx.fill()
}

export const SAHEL_DECORATIONS = {
  channel,
  cistern,
  solarPump,
  halfMoons,
  saplings,
  oasisGarden,
  earthHouse,
  windcatcher,
  cookstove,
  dripLines,
  minigrid,
}

// --- wildlife ---------------------------------------------------------------------------

function step(t: number, range: number, speed: number): { dx: number; facing: number } {
  const phase = t * speed
  return { dx: Math.sin(phase) * range, facing: Math.cos(phase) >= 0 ? 1 : -1 }
}

// A white stork wading through the gardens on long red legs.
const whiteStork: SpeciesSprite = (ctx, x, y, s, t) => {
  const { dx, facing } = step(t, 4 * s, 0.25)
  ctx.beginPath()
  ctx.ellipse(x + dx, y + 0.4 * s, 3 * s, 1 * s, 0, 0, Math.PI * 2)
  ctx.fillStyle = PALETTE.shadow
  ctx.fill()
  ctx.save()
  ctx.translate(x + dx, y)
  ctx.scale(facing, 1)
  ctx.strokeStyle = '#d9533a'
  ctx.lineWidth = Math.max(0.5, 0.45 * s)
  ctx.beginPath()
  ctx.moveTo(-0.6 * s, 0)
  ctx.lineTo(-0.4 * s, -5 * s)
  ctx.moveTo(0.8 * s, 0)
  ctx.lineTo(0.4 * s, -5 * s)
  ctx.stroke()
  ctx.beginPath()
  ctx.ellipse(0, -6.4 * s, 3.2 * s, 1.8 * s, -0.15, 0, Math.PI * 2)
  fillOutlined(ctx, '#f7f5f0', s, 0.4)
  ctx.beginPath()
  ctx.ellipse(-1.6 * s, -6 * s, 2 * s, 1.1 * s, -0.2, 0, Math.PI * 2)
  ctx.fillStyle = '#2a2826'
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(2 * s, -7 * s)
  ctx.quadraticCurveTo(2.6 * s, -9 * s, 2.4 * s, -10.4 * s)
  ctx.strokeStyle = '#f7f5f0'
  ctx.lineWidth = Math.max(0.8, 1.1 * s)
  ctx.stroke()
  circle(ctx, 2.5 * s, -10.6 * s, 0.9 * s)
  fillOutlined(ctx, '#f7f5f0', s, 0.3)
  ctx.beginPath()
  ctx.moveTo(3.2 * s, -10.6 * s)
  ctx.lineTo(5.6 * s, -10 * s)
  ctx.strokeStyle = '#d9533a'
  ctx.lineWidth = Math.max(0.5, 0.5 * s)
  ctx.stroke()
  ctx.restore()
}

// A fennec fox: small and sandy, with enormous ears.
const fennecFox: SpeciesSprite = (ctx, x, y, s, t) => {
  const { dx, facing } = step(t, 5 * s, 0.4)
  ctx.beginPath()
  ctx.ellipse(x + dx, y + 0.4 * s, 3 * s, 1 * s, 0, 0, Math.PI * 2)
  ctx.fillStyle = PALETTE.shadow
  ctx.fill()
  ctx.save()
  ctx.translate(x + dx, y)
  ctx.scale(facing, 1)
  const fur = '#e8c48e'
  ctx.beginPath()
  ctx.ellipse(-3.6 * s, -1.8 * s, 2 * s, 0.9 * s, 0.5, 0, Math.PI * 2)
  fillOutlined(ctx, fur, s, 0.3)
  ctx.beginPath()
  ctx.ellipse(-0.4 * s, -1.8 * s, 2.6 * s, 1.5 * s, 0, 0, Math.PI * 2)
  fillOutlined(ctx, fur, s, 0.4)
  circle(ctx, 2.3 * s, -2.6 * s, 1.3 * s)
  fillOutlined(ctx, fur, s, 0.4)
  for (const ex of [1.6, 3]) {
    ctx.beginPath()
    ctx.moveTo(ex * s - 0.8 * s, -3.4 * s)
    ctx.lineTo(ex * s, -7 * s)
    ctx.lineTo(ex * s + 0.8 * s, -3.4 * s)
    ctx.closePath()
    fillOutlined(ctx, fur, s, 0.3)
    ctx.beginPath()
    ctx.moveTo(ex * s - 0.35 * s, -3.8 * s)
    ctx.lineTo(ex * s, -6 * s)
    ctx.lineTo(ex * s + 0.35 * s, -3.8 * s)
    ctx.closePath()
    ctx.fillStyle = '#f2b8a8'
    ctx.fill()
  }
  circle(ctx, 2.8 * s, -2.8 * s, 0.3 * s)
  ctx.fillStyle = '#1d1d1b'
  ctx.fill()
  circle(ctx, 3.6 * s, -2.3 * s, 0.3 * s)
  ctx.fill()
  ctx.restore()
}

export const SAHEL_SPECIES: Record<string, SpeciesSprite> = { white_stork: whiteStork, fennec_fox: fennecFox }
