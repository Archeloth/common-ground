import type { Ctx } from '../kit'
import { PALETTE, ROOFS, WALLS, circle, fillOutlined, groundShadow, mix, pick, roundRect } from '../kit'
import type { Plot } from '../../scene/layout'
import type { Overlays } from '../buildings'
import { snowOnPath } from '../../scene/season'
import type { SpeciesSprite } from '../wildlife'

// The East Asian mountain village (Milestone 10 preview): thatched farmhouses,
// tiled houses with upturned eaves, white storehouses, pines, cherries,
// bamboo and rice terraces. Drawn around a ground point (x, y) at scale s,
// in the theme's palette (walls are plaster and dark wood, roofs grey tile).

function panelOn(ctx: Ctx, x: number, y: number, w: number, s: number): void {
  roundRect(ctx, x, y, w, 1.5 * s, 0.3 * s)
  ctx.fillStyle = PALETTE.panel
  ctx.fill()
}

function lattice(ctx: Ctx, x: number, y: number, w: number, h: number, s: number, warm: boolean): void {
  roundRect(ctx, x, y, w, h, 0.3 * s)
  ctx.fillStyle = warm ? PALETTE.windowWarm : '#efe7d4'
  ctx.fill()
  ctx.strokeStyle = 'rgba(74, 58, 46, 0.7)'
  ctx.lineWidth = Math.max(0.3, 0.25 * s)
  ctx.beginPath()
  ctx.moveTo(x + w / 2, y)
  ctx.lineTo(x + w / 2, y + h)
  ctx.moveTo(x, y + h / 2)
  ctx.lineTo(x + w, y + h / 2)
  ctx.stroke()
}

// A minka farmhouse: dark timber walls under a tall, steep thatched roof.
export function minka(ctx: Ctx, b: Plot, x: number, y: number, s: number, o: Overlays): void {
  const w = 13 * s
  const h = 6 * s
  const left = x - w / 2
  const top = y - h
  groundShadow(ctx, x, y, 18, s)
  roundRect(ctx, left, top, w, h, 0.6 * s)
  fillOutlined(ctx, pick([PALETTE.wallSand, PALETTE.wallMint], b.variant), s)
  lattice(ctx, left + 1.6 * s, top + 1.4 * s, 3 * s, 2.6 * s, s, o.retrofit)
  lattice(ctx, left + w - 4.6 * s, top + 1.4 * s, 3 * s, 2.6 * s, s, o.retrofit)
  const thatch = o.retrofit ? mix('#b89a62', '#d9b56a', 0.4) : '#a88b5a'
  ctx.beginPath()
  ctx.moveTo(left - 2 * s, top + 0.8 * s)
  ctx.lineTo(x - 2.4 * s, top - 9 * s)
  ctx.lineTo(x + 2.4 * s, top - 9 * s)
  ctx.lineTo(left + w + 2 * s, top + 0.8 * s)
  ctx.closePath()
  fillOutlined(ctx, thatch, s)
  // The thick thatch edge and a dark ridge cap.
  roundRect(ctx, left - 2 * s, top - 0.4 * s, w + 4 * s, 1.4 * s, 0.6 * s)
  ctx.fillStyle = mix(thatch, '#5a4632', 0.3)
  ctx.fill()
  roundRect(ctx, x - 3 * s, top - 9.8 * s, 6 * s, 1.2 * s, 0.4 * s)
  ctx.fillStyle = '#4a4440'
  ctx.fill()
  snowOnPath(ctx, top - 10 * s, top - 6 * s)
  if (o.solar) panelOn(ctx, x + 0.5 * s, top - 6.5 * s, 4 * s, s)
}

// A two-storey town house: plaster and timber, a grey tiled roof with
// upturned eaves.
export function tiledHouse(ctx: Ctx, b: Plot, x: number, y: number, s: number, o: Overlays): void {
  const w = 11 * s
  const h = 10 * s
  const left = x - w / 2
  const top = y - h
  groundShadow(ctx, x, y, 16, s)
  roundRect(ctx, left, top, w, h, 0.6 * s)
  fillOutlined(ctx, pick(WALLS, (b.variant * 7) % 1), s)
  ctx.fillStyle = mix(PALETTE.wallSand, '#2a1c12', 0.2)
  ctx.fillRect(left, top + h * 0.48, w, 0.8 * s)
  lattice(ctx, left + 1.4 * s, top + 1.6 * s, 3.2 * s, 2.8 * s, s, o.retrofit)
  lattice(ctx, left + w - 4.6 * s, top + 1.6 * s, 3.2 * s, 2.8 * s, s, o.retrofit)
  roundRect(ctx, x - 1.6 * s, y - 4.2 * s, 3.2 * s, 4.2 * s, 0.3 * s)
  ctx.fillStyle = PALETTE.door
  ctx.fill()
  const roof = o.retrofit ? PALETTE.roofCosy : pick(ROOFS, b.variant)
  ctx.beginPath()
  ctx.moveTo(left - 2.6 * s, top - 0.6 * s)
  ctx.quadraticCurveTo(left - 0.6 * s, top, left + 0.6 * s, top - 2 * s)
  ctx.lineTo(x, top - 5.6 * s)
  ctx.lineTo(left + w - 0.6 * s, top - 2 * s)
  ctx.quadraticCurveTo(left + w + 0.6 * s, top, left + w + 2.6 * s, top - 0.6 * s)
  ctx.lineTo(left + w + 1.6 * s, top + 0.8 * s)
  ctx.lineTo(left - 1.6 * s, top + 0.8 * s)
  ctx.closePath()
  fillOutlined(ctx, roof, s)
  ctx.strokeStyle = 'rgba(255,255,255,0.18)'
  ctx.lineWidth = Math.max(0.3, 0.3 * s)
  for (let i = 1; i < 6; i++) {
    const tx = left + (w * i) / 6
    ctx.beginPath()
    ctx.moveTo(tx, top - 0.2 * s)
    ctx.lineTo(tx + (x - tx) * 0.5, top - 3.6 * s)
    ctx.stroke()
  }
  snowOnPath(ctx, top - 6 * s, top - 2.4 * s)
  if (o.solar) panelOn(ctx, x - 4 * s, top - 3.2 * s, 4 * s, s)
}

// A kura: a white plastered storehouse on a dark base, small tiled roof.
export function kura(ctx: Ctx, b: Plot, x: number, y: number, s: number, o: Overlays): void {
  const w = 8 * s
  const h = 9 * s
  const left = x - w / 2
  const top = y - h
  groundShadow(ctx, x, y, 12, s)
  roundRect(ctx, left, top, w, h, 0.4 * s)
  fillOutlined(ctx, '#f4f1ea', s)
  ctx.fillStyle = '#3e3a38'
  ctx.fillRect(left, y - 2.6 * s, w, 2.6 * s)
  ctx.strokeStyle = '#f4f1ea'
  ctx.lineWidth = Math.max(0.3, 0.3 * s)
  for (let i = 0; i < 4; i++) {
    ctx.beginPath()
    ctx.moveTo(left + (i + 0.5) * (w / 4) - 0.8 * s, y - 2.2 * s)
    ctx.lineTo(left + (i + 0.5) * (w / 4) + 0.8 * s, y - 0.4 * s)
    ctx.stroke()
  }
  roundRect(ctx, x - 1 * s, top + 1.6 * s, 2 * s, 1.6 * s, 0.2 * s)
  ctx.fillStyle = '#3e3a38'
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(left - 1.4 * s, top + 0.4 * s)
  ctx.lineTo(x, top - 3.6 * s)
  ctx.lineTo(left + w + 1.4 * s, top + 0.4 * s)
  ctx.closePath()
  fillOutlined(ctx, pick(ROOFS, b.variant), s)
  snowOnPath(ctx, top - 4 * s, top - 1.4 * s)
  void o
}

// --- plants -----------------------------------------------------------------------

// A Japanese black pine: a leaning trunk with flat cloud-like layers.
export function pine(ctx: Ctx, x: number, y: number, s: number, variant: number): void {
  const lean = (variant - 0.5) * 4 * s
  groundShadow(ctx, x, y, 10, s)
  ctx.beginPath()
  ctx.moveTo(x - 0.8 * s, y)
  ctx.quadraticCurveTo(x + lean, y - 6 * s, x + lean * 1.4, y - 11 * s)
  ctx.lineTo(x + lean * 1.4 + 1 * s, y - 11 * s)
  ctx.quadraticCurveTo(x + lean + 1 * s, y - 6 * s, x + 0.8 * s, y)
  ctx.closePath()
  fillOutlined(ctx, mix(PALETTE.trunk, '#3a2a1f', 0.25), s, 0.4)
  const pads: Array<[number, number, number]> = [
    [lean * 0.6 - 3.4 * s, -6.5 * s, 3.4],
    [lean + 3 * s, -8.8 * s, 3],
    [lean * 1.4, -12 * s, 3.6],
  ]
  for (const [dx, dy, r] of pads) {
    ctx.beginPath()
    ctx.ellipse(x + dx, y + dy, r * s, r * 0.48 * s, 0, 0, Math.PI * 2)
    fillOutlined(ctx, PALETTE.conifer, s, 0.4)
    snowOnPath(ctx, y + dy - r * 0.5 * s, y + dy)
  }
}

// A cherry: a round crown in the blossom colour (pink in spring, leafy later).
export function cherry(ctx: Ctx, x: number, y: number, s: number, variant: number): void {
  groundShadow(ctx, x, y, 10, s)
  ctx.strokeStyle = mix(PALETTE.trunk, '#3a2a1f', 0.3)
  ctx.lineCap = 'round'
  ctx.lineWidth = Math.max(0.8, 1.2 * s)
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(x, y - 4 * s)
  ctx.lineTo(x - 2 * s, y - 6.5 * s)
  ctx.moveTo(x, y - 4 * s)
  ctx.lineTo(x + 2.2 * s, y - 6.8 * s)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(x - 2.6 * s, y - 7.4 * s, 3 * s, 0, Math.PI * 2)
  ctx.arc(x + 2.6 * s, y - 7.6 * s, 3 * s, 0, Math.PI * 2)
  ctx.arc(x, y - 9.8 * s, 3.4 * s, 0, Math.PI * 2)
  fillOutlined(ctx, PALETTE.blossom, s, 0.4)
  snowOnPath(ctx, y - 13.4 * s, y - 10.6 * s)
  for (let i = 0; i < 5; i++) {
    circle(ctx, x - 3 * s + ((i * 37 + variant * 100) % 6) * s, y - 7 * s - ((i * 23) % 5) * s, 0.5 * s)
    ctx.fillStyle = 'rgba(255,255,255,0.45)'
    ctx.fill()
  }
}

// A clump of bamboo: tall jointed canes with a few leaf sprays.
export function bamboo(ctx: Ctx, x: number, y: number, s: number, variant: number): void {
  groundShadow(ctx, x, y, 8, s)
  ctx.lineCap = 'round'
  for (let i = 0; i < 5; i++) {
    const cx = x + (i - 2) * 1.3 * s
    const tall = (11 + ((i * 7 + variant * 10) % 4)) * s
    const lean = (i - 2) * 0.5 * s
    ctx.beginPath()
    ctx.moveTo(cx, y)
    ctx.lineTo(cx + lean, y - tall)
    ctx.strokeStyle = i % 2 === 0 ? '#7fa05a' : '#6a8f4a'
    ctx.lineWidth = Math.max(0.6, 0.8 * s)
    ctx.stroke()
    for (let j = 1; j < 4; j++) {
      const jy = y - (tall * j) / 4
      const jx = cx + (lean * j) / 4
      ctx.beginPath()
      ctx.moveTo(jx - 0.5 * s, jy)
      ctx.lineTo(jx + 0.5 * s, jy)
      ctx.strokeStyle = '#4f6f3a'
      ctx.lineWidth = Math.max(0.4, 0.3 * s)
      ctx.stroke()
    }
    ctx.beginPath()
    ctx.ellipse(cx + lean + 1.4 * s, y - tall + 1 * s, 1.6 * s, 0.5 * s, -0.4, 0, Math.PI * 2)
    ctx.fillStyle = PALETTE.leaf
    ctx.fill()
  }
}

// Rice terraces: stepped, curving paddies, green rice over shining water.
export function paddy(ctx: Ctx, x: number, y: number, s: number, variant: number): void {
  const w = 24 * s
  for (let i = 0; i < 3; i++) {
    const ty = y - i * 3.2 * s
    const tw = w - i * 3 * s
    ctx.beginPath()
    ctx.moveTo(x - tw / 2, ty)
    ctx.quadraticCurveTo(x, ty + 1.4 * s, x + tw / 2, ty)
    ctx.lineTo(x + tw / 2 - 0.8 * s, ty - 3 * s)
    ctx.quadraticCurveTo(x, ty - 1.8 * s, x - tw / 2 + 0.8 * s, ty - 3 * s)
    ctx.closePath()
    ctx.fillStyle = mix(PALETTE.crop, '#9cc6d8', variant > 0.5 ? 0.25 : 0.1)
    ctx.fill()
    ctx.lineWidth = Math.max(0.6, 0.8 * s)
    ctx.strokeStyle = mix(PALETTE.soil, '#5a4632', 0.2)
    ctx.stroke()
    ctx.strokeStyle = mix(PALETTE.crop, '#2f5a2a', 0.3)
    ctx.lineWidth = Math.max(0.3, 0.3 * s)
    for (let k = -3; k <= 3; k++) {
      ctx.beginPath()
      ctx.moveTo(x + k * 3 * s, ty - 0.6 * s)
      ctx.lineTo(x + k * 3 * s + 0.6 * s, ty - 2.4 * s)
      ctx.stroke()
    }
  }
}

// --- project scenes -------------------------------------------------------------------

// Woodland care: cut poles stacked to dry, and logs sprouting shiitake.
function coppice(ctx: Ctx, x: number, y: number, s: number): void {
  groundShadow(ctx, x, y, 20, s)
  for (let row = 0; row < 3; row++) {
    for (let i = 0; i < 4 - row; i++) {
      const cx = x - 7 * s + i * 2.6 * s + row * 1.3 * s
      const cy = y - 1.2 * s - row * 2.2 * s
      circle(ctx, cx, cy, 1.2 * s)
      fillOutlined(ctx, '#b08a62', s, 0.3)
      circle(ctx, cx, cy, 0.5 * s)
      ctx.fillStyle = '#8a6a48'
      ctx.fill()
    }
  }
  ctx.save()
  ctx.translate(x + 5 * s, y - 3 * s)
  ctx.rotate(-0.9)
  roundRect(ctx, -1.2 * s, -6 * s, 2.4 * s, 9 * s, 1 * s)
  fillOutlined(ctx, '#7a5a3e', s, 0.3)
  ctx.restore()
  for (const [dx, dy] of [
    [4.4, -5],
    [6, -3.4],
    [7.4, -1.8],
  ]) {
    ctx.beginPath()
    ctx.ellipse(x + dx * s, y + dy * s, 1 * s, 0.6 * s, 0, Math.PI, 0)
    fillOutlined(ctx, '#8a5a35', s, 0.3)
  }
}

// Terrace repair: a dry-stone retaining wall and fresh soil, with steps.
function terrace(ctx: Ctx, x: number, y: number, s: number): void {
  groundShadow(ctx, x, y, 22, s)
  roundRect(ctx, x - 11 * s, y - 4 * s, 22 * s, 4 * s, 0.6 * s)
  fillOutlined(ctx, '#a39d90', s)
  for (let row = 0; row < 2; row++) {
    for (let i = 0; i < 7; i++) {
      roundRect(ctx, x - 10.6 * s + i * 3.1 * s + (row % 2) * 1.5 * s, y - 3.6 * s + row * 1.8 * s, 2.8 * s, 1.6 * s, 0.5 * s)
      ctx.fillStyle = pick(['#b7b1a4', '#c4beb1', '#aaa396'], ((i + row) * 0.37) % 1)
      ctx.fill()
    }
  }
  roundRect(ctx, x - 11 * s, y - 7 * s, 22 * s, 3 * s, 0.8 * s)
  ctx.fillStyle = mix(PALETTE.crop, '#9cc6d8', 0.2)
  ctx.fill()
  for (let i = 0; i < 3; i++) {
    roundRect(ctx, x + 6 * s + i * 1.2 * s, y - (i + 1) * 1.4 * s, 2.6 * s, 1.4 * s, 0.3 * s)
    fillOutlined(ctx, '#c4beb1', s, 0.3)
  }
}

// A rice-fish paddy: rice rows over water, with carp nosing between them.
function paddyFish(ctx: Ctx, x: number, y: number, s: number): void {
  groundShadow(ctx, x, y, 22, s)
  roundRect(ctx, x - 10 * s, y - 7 * s, 20 * s, 7 * s, 1.6 * s)
  fillOutlined(ctx, '#8cb9cc', s, 0.5)
  ctx.strokeStyle = PALETTE.crop
  ctx.lineCap = 'round'
  ctx.lineWidth = Math.max(0.5, 0.6 * s)
  for (let r = 0; r < 3; r++) {
    for (let i = 0; i < 8; i++) {
      const rx = x - 8.6 * s + i * 2.4 * s
      const ry = y - 5.6 * s + r * 2.2 * s
      ctx.beginPath()
      ctx.moveTo(rx, ry + 1 * s)
      ctx.lineTo(rx - 0.4 * s, ry - 0.8 * s)
      ctx.moveTo(rx, ry + 1 * s)
      ctx.lineTo(rx + 0.5 * s, ry - 0.7 * s)
      ctx.stroke()
    }
  }
  for (const [dx, dy, c] of [
    [-3, -2.4, '#e8823a'],
    [4, -4.4, '#f2f0ea'],
  ] as const) {
    ctx.beginPath()
    ctx.ellipse(x + dx * s, y + dy * s, 1.4 * s, 0.6 * s, 0.2, 0, Math.PI * 2)
    ctx.fillStyle = c
    ctx.fill()
  }
}

// Micro-hydro: a small turbine house beside a channel, with a waterwheel.
function waterwheel(ctx: Ctx, x: number, y: number, s: number): void {
  groundShadow(ctx, x, y, 20, s)
  roundRect(ctx, x - 11 * s, y - 2 * s, 22 * s, 2 * s, 0.8 * s)
  ctx.fillStyle = PALETTE.water
  ctx.fill()
  roundRect(ctx, x - 9 * s, y - 8 * s, 8 * s, 6 * s, 0.6 * s)
  fillOutlined(ctx, PALETTE.wallSand, s)
  ctx.beginPath()
  ctx.moveTo(x - 10 * s, y - 7.6 * s)
  ctx.lineTo(x - 5 * s, y - 11 * s)
  ctx.lineTo(x, y - 7.6 * s)
  ctx.closePath()
  fillOutlined(ctx, pick(ROOFS, 0.2), s)
  circle(ctx, x + 5 * s, y - 5 * s, 4.4 * s)
  fillOutlined(ctx, '#8a6a48', s, 0.6)
  circle(ctx, x + 5 * s, y - 5 * s, 3.2 * s)
  ctx.fillStyle = PALETTE.water
  ctx.fill()
  ctx.strokeStyle = '#6e5040'
  ctx.lineWidth = Math.max(0.5, 0.6 * s)
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2
    ctx.beginPath()
    ctx.moveTo(x + 5 * s, y - 5 * s)
    ctx.lineTo(x + 5 * s + Math.cos(a) * 4.4 * s, y - 5 * s + Math.sin(a) * 4.4 * s)
    ctx.stroke()
  }
  ctx.beginPath()
  ctx.moveTo(x - 3 * s, y - 10.6 * s)
  ctx.lineTo(x - 4 * s, y - 8.8 * s)
  ctx.lineTo(x - 2.8 * s, y - 8.8 * s)
  ctx.lineTo(x - 3.8 * s, y - 7 * s)
  ctx.strokeStyle = '#f2b830'
  ctx.stroke()
}

// A biogas digester: a buried dome, a gas pipe and a little flame.
function biogas(ctx: Ctx, x: number, y: number, s: number): void {
  groundShadow(ctx, x, y, 18, s)
  ctx.beginPath()
  ctx.ellipse(x - 2 * s, y - 1 * s, 7 * s, 4.6 * s, 0, Math.PI, 0)
  fillOutlined(ctx, '#9aa38a', s)
  roundRect(ctx, x - 3 * s, y - 6.4 * s, 2 * s, 1.4 * s, 0.4 * s)
  fillOutlined(ctx, '#6e6a62', s, 0.3)
  ctx.strokeStyle = '#8b8f94'
  ctx.lineWidth = Math.max(0.6, 0.7 * s)
  ctx.beginPath()
  ctx.moveTo(x - 2 * s, y - 6.4 * s)
  ctx.lineTo(x - 2 * s, y - 8 * s)
  ctx.lineTo(x + 7 * s, y - 8 * s)
  ctx.lineTo(x + 7 * s, y - 3 * s)
  ctx.stroke()
  roundRect(ctx, x + 5 * s, y - 3 * s, 4 * s, 3 * s, 0.4 * s)
  fillOutlined(ctx, '#4a4440', s, 0.3)
  ctx.beginPath()
  ctx.ellipse(x + 7 * s, y - 4 * s, 0.8 * s, 1.4 * s, 0, 0, Math.PI * 2)
  ctx.fillStyle = '#5f9ad6'
  ctx.fill()
}

// Solar water heaters: a flat collector and a tank on a frame.
function solarHeater(ctx: Ctx, x: number, y: number, s: number): void {
  groundShadow(ctx, x, y, 16, s)
  ctx.strokeStyle = '#8b8f94'
  ctx.lineWidth = Math.max(0.6, 0.6 * s)
  ctx.beginPath()
  ctx.moveTo(x - 6 * s, y)
  ctx.lineTo(x - 6 * s, y - 3 * s)
  ctx.moveTo(x + 5 * s, y)
  ctx.lineTo(x + 5 * s, y - 6 * s)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(x - 8 * s, y - 3 * s)
  ctx.lineTo(x - 5 * s, y - 8.6 * s)
  ctx.lineTo(x + 5 * s, y - 8.6 * s)
  ctx.lineTo(x + 2 * s, y - 3 * s)
  ctx.closePath()
  fillOutlined(ctx, '#2f4f6f', s, 0.4)
  ctx.strokeStyle = 'rgba(255,255,255,0.4)'
  ctx.lineWidth = Math.max(0.3, 0.3 * s)
  for (let i = 1; i < 5; i++) {
    ctx.beginPath()
    ctx.moveTo(x - 8 * s + i * 2 * s, y - 3 * s)
    ctx.lineTo(x - 5 * s + i * 2 * s, y - 8.6 * s)
    ctx.stroke()
  }
  roundRect(ctx, x - 5.6 * s, y - 11 * s, 11 * s, 2.4 * s, 1.2 * s)
  fillOutlined(ctx, '#d9dde0', s, 0.4)
}

// Teikei boxes: wooden crates of vegetables waiting for their households.
function veggieBoxes(ctx: Ctx, x: number, y: number, s: number): void {
  groundShadow(ctx, x, y, 18, s)
  const crops = ['#e07a3a', '#6aa84a', '#d9533a', '#f2c94c']
  for (let i = 0; i < 4; i++) {
    const bx = x - 8 * s + (i % 2) * 7 * s + Math.floor(i / 2) * 2 * s
    const by = y - Math.floor(i / 2) * 3.4 * s
    roundRect(ctx, bx, by - 3 * s, 6 * s, 3 * s, 0.4 * s)
    fillOutlined(ctx, '#c49a6c', s, 0.4)
    for (let k = 0; k < 3; k++) {
      circle(ctx, bx + 1.2 * s + k * 1.8 * s, by - 3.2 * s, 0.9 * s)
      ctx.fillStyle = crops[(i + k) % crops.length]
      ctx.fill()
    }
  }
}

// An empty house being renovated: scaffolding and fresh timber.
function akiyaHouse(ctx: Ctx, x: number, y: number, s: number): void {
  tiledHouse(ctx, { x, y, size: 8, variant: 0.4 }, x - 2 * s, y, s * 0.85, { solar: false, retrofit: true, heatPump: false })
  ctx.strokeStyle = '#c49a6c'
  ctx.lineWidth = Math.max(0.6, 0.6 * s)
  ctx.beginPath()
  for (const dx of [4, 8]) {
    ctx.moveTo(x + dx * s, y)
    ctx.lineTo(x + dx * s, y - 11 * s)
  }
  for (const h of [4, 8]) {
    ctx.moveTo(x + 3 * s, y - h * s)
    ctx.lineTo(x + 9 * s, y - h * s)
  }
  ctx.stroke()
}

// A water-retaining lane: permeable paving with planted swales.
function spongeLane(ctx: Ctx, x: number, y: number, s: number): void {
  groundShadow(ctx, x, y, 22, s)
  roundRect(ctx, x - 11 * s, y - 5 * s, 22 * s, 5 * s, 1 * s)
  fillOutlined(ctx, '#c4beb1', s, 0.4)
  for (let i = 0; i < 9; i++) {
    roundRect(ctx, x - 10.4 * s + i * 2.4 * s, y - 4.4 * s, 2 * s, 1.6 * s, 0.3 * s)
    ctx.fillStyle = '#d6d0c4'
    ctx.fill()
  }
  roundRect(ctx, x - 10 * s, y - 2.2 * s, 20 * s, 1.6 * s, 0.8 * s)
  ctx.fillStyle = mix(PALETTE.leaf, '#6aa0b8', 0.3)
  ctx.fill()
  for (let i = 0; i < 6; i++) {
    circle(ctx, x - 8 * s + i * 3.2 * s, y - 2 * s, 0.9 * s)
    ctx.fillStyle = PALETTE.leafLight
    ctx.fill()
  }
}

export const EAST_ASIA_DECORATIONS = {
  coppice,
  terrace,
  paddyFish,
  waterwheel,
  biogas,
  solarHeater,
  veggieBoxes,
  akiyaHouse,
  spongeLane,
}

// --- wildlife ---------------------------------------------------------------------------

// A grey heron standing still in the paddy, then striking.
const greyHeron: SpeciesSprite = (ctx, x, y, s, t) => {
  const strike = Math.max(0, Math.sin(t * 0.7)) ** 12
  ctx.beginPath()
  ctx.ellipse(x, y + 0.4 * s, 3 * s, 1 * s, 0, 0, Math.PI * 2)
  ctx.fillStyle = PALETTE.shadow
  ctx.fill()
  ctx.strokeStyle = '#8a7a5a'
  ctx.lineWidth = Math.max(0.5, 0.4 * s)
  ctx.beginPath()
  ctx.moveTo(-0.4 * s + x, y)
  ctx.lineTo(x - 0.2 * s, y - 5 * s)
  ctx.moveTo(x + 0.8 * s, y)
  ctx.lineTo(x + 0.5 * s, y - 5 * s)
  ctx.stroke()
  ctx.beginPath()
  ctx.ellipse(x, y - 6.6 * s, 3 * s, 1.7 * s, -0.25, 0, Math.PI * 2)
  fillOutlined(ctx, '#9aa3ab', s, 0.4)
  const hx = x + (2.4 + strike * 1.6) * s
  const hy = y - (10.2 - strike * 3) * s
  ctx.beginPath()
  ctx.moveTo(x + 2 * s, y - 7.4 * s)
  ctx.quadraticCurveTo(x + 1.4 * s, y - 9 * s, hx, hy)
  ctx.strokeStyle = '#e8ecee'
  ctx.lineWidth = Math.max(0.7, 0.9 * s)
  ctx.stroke()
  circle(ctx, hx, hy, 0.85 * s)
  fillOutlined(ctx, '#e8ecee', s, 0.3)
  ctx.beginPath()
  ctx.moveTo(hx - 0.6 * s, hy - 0.4 * s)
  ctx.lineTo(hx - 2.4 * s, hy - 0.1 * s)
  ctx.strokeStyle = '#2a2826'
  ctx.lineWidth = Math.max(0.4, 0.4 * s)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(hx + 0.6 * s, hy)
  ctx.lineTo(hx + 2.8 * s, hy + 0.5 * s)
  ctx.strokeStyle = '#e0a33a'
  ctx.lineWidth = Math.max(0.5, 0.5 * s)
  ctx.stroke()
}

// Genji fireflies: a few soft lights drifting over the stream.
const genjiFirefly: SpeciesSprite = (ctx, x, y, s, t) => {
  for (let i = 0; i < 5; i++) {
    const a = t * (0.5 + i * 0.13) + i * 1.7
    const fx = x + Math.sin(a) * (4 + i) * s
    const fy = y - (5 + i * 1.6) * s + Math.cos(a * 1.3) * 1.5 * s
    const glow = 0.45 + 0.55 * Math.max(0, Math.sin(t * 2.2 + i * 2.1))
    ctx.beginPath()
    ctx.arc(fx, fy, 2.2 * s, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(214, 255, 120, ${0.18 * glow})`
    ctx.fill()
    circle(ctx, fx, fy, 0.7 * s)
    ctx.fillStyle = `rgba(232, 255, 150, ${0.6 + 0.4 * glow})`
    ctx.fill()
  }
}

export const EAST_ASIA_SPECIES: Record<string, SpeciesSprite> = { grey_heron: greyHeron, genji_firefly: genjiFirefly }
