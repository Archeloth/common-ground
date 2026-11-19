import type { Ctx } from './kit'
import { PALETTE, ROOFS, WALLS, circle, fillOutlined, groundShadow, mix, pick, roundRect } from './kit'
import type { Building, BuildingStyle, Greenery, GreeneryStyle, Plot } from '../scene/layout'
import { acacia, ksarTower, millet, mudhouse, palm, tent } from './regions/sahel'
import { snowOnPath } from '../scene/season'

// Buildings and greenery for the districts (Milestone 9). Every sprite is drawn
// around its ground point (x, y in screen pixels) at scale s. The overlay
// flags make progress visible on the houses themselves: solar panels appear
// on roofs, retrofitted homes get cosy new roofs and warm windows, heat pumps
// sit beside the walls.

export interface Overlays {
  solar: boolean
  retrofit: boolean
  heatPump: boolean
}

const NONE: Overlays = { solar: false, retrofit: false, heatPump: false }

function solarPanel(ctx: Ctx, x: number, y: number, w: number, h: number, slant: number, s: number): void {
  ctx.beginPath()
  ctx.moveTo(x, y + h)
  ctx.lineTo(x + slant, y)
  ctx.lineTo(x + slant + w, y)
  ctx.lineTo(x + w, y + h)
  ctx.closePath()
  ctx.fillStyle = PALETTE.panel
  ctx.fill()
  ctx.lineWidth = Math.max(0.5, 0.35 * s)
  ctx.strokeStyle = PALETTE.panelShine
  ctx.stroke()
  // Cell lines and a little shine, so it reads as a panel even when tiny.
  ctx.beginPath()
  ctx.moveTo(x + w / 2, y + h)
  ctx.lineTo(x + slant + w / 2, y)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(x + slant * 0.3 + w * 0.15, y + h * 0.3)
  ctx.lineTo(x + slant * 0.3 + w * 0.35, y + h * 0.3)
  ctx.strokeStyle = 'rgba(255,255,255,0.6)'
  ctx.stroke()
}

function windowPane(ctx: Ctx, x: number, y: number, w: number, h: number, warm: boolean, s: number): void {
  roundRect(ctx, x, y, w, h, 0.5 * s)
  ctx.fillStyle = warm ? PALETTE.windowWarm : PALETTE.window
  ctx.fill()
  if (warm) {
    // A soft glow around lit windows: retrofitted homes look cosy.
    ctx.save()
    ctx.globalAlpha = 0.25
    roundRect(ctx, x - 0.5 * s, y - 0.5 * s, w + s, h + s, 0.8 * s)
    ctx.fillStyle = PALETTE.windowWarm
    ctx.fill()
    ctx.restore()
  }
}

function heatPumpUnit(ctx: Ctx, x: number, y: number, s: number): void {
  roundRect(ctx, x, y - 3 * s, 3.4 * s, 3 * s, 0.6 * s)
  fillOutlined(ctx, PALETTE.white, s, 0.4)
  circle(ctx, x + 1.7 * s, y - 1.5 * s, 1 * s)
  ctx.strokeStyle = '#9fb1bf'
  ctx.lineWidth = Math.max(0.5, 0.4 * s)
  ctx.stroke()
}

function house(ctx: Ctx, b: Plot, x: number, y: number, s: number, o: Overlays): void {
  const w = 12 * s
  const h = 8 * s
  const left = x - w / 2
  const top = y - h
  const roof = o.retrofit ? PALETTE.roofCosy : pick(ROOFS, b.variant)
  groundShadow(ctx, x, y, 17, s)
  roundRect(ctx, left, top, w, h, 1.2 * s)
  fillOutlined(ctx, pick(WALLS, (b.variant * 7) % 1), s)
  // Roof with a friendly overhang.
  ctx.beginPath()
  ctx.moveTo(left - 1.6 * s, top + 0.8 * s)
  ctx.lineTo(x, top - 6.5 * s)
  ctx.lineTo(left + w + 1.6 * s, top + 0.8 * s)
  ctx.closePath()
  ctx.lineJoin = 'round'
  fillOutlined(ctx, roof, s)
  snowOnPath(ctx, top - 7 * s, top - 2.6 * s)
  if (o.solar) solarPanel(ctx, x + 0.8 * s, top - 4.8 * s, 4.6 * s, 3.6 * s, -2.6 * s, s)
  roundRect(ctx, x - 1.4 * s, y - 4.6 * s, 2.8 * s, 4.6 * s, 0.8 * s)
  ctx.fillStyle = PALETTE.door
  ctx.fill()
  windowPane(ctx, left + 1.4 * s, top + 2 * s, 2.6 * s, 2.4 * s, o.retrofit, s)
  windowPane(ctx, left + w - 4 * s, top + 2 * s, 2.6 * s, 2.4 * s, o.retrofit, s)
  if (o.heatPump) heatPumpUnit(ctx, left + w + 0.6 * s, y, s)
}

function terrace(ctx: Ctx, b: Plot, x: number, y: number, s: number, o: Overlays): void {
  const unit = 6.5 * s
  const h = 10 * s
  const left = x - unit * 1.5
  const top = y - h
  groundShadow(ctx, x, y, 22, s)
  for (let i = 0; i < 3; i++) {
    const v = (b.variant + i * 0.37) % 1
    const ux = left + i * unit
    roundRect(ctx, ux, top, unit, h, 0.8 * s)
    fillOutlined(ctx, pick(WALLS, v), s)
    ctx.beginPath()
    ctx.moveTo(ux - 0.4 * s, top + 0.6 * s)
    ctx.lineTo(ux + unit / 2, top - 4.5 * s)
    ctx.lineTo(ux + unit + 0.4 * s, top + 0.6 * s)
    ctx.closePath()
    ctx.lineJoin = 'round'
    fillOutlined(ctx, o.retrofit ? PALETTE.roofCosy : pick(ROOFS, (v * 3) % 1), s)
    snowOnPath(ctx, top - 5 * s, top - 1.8 * s)
    if (o.solar && i !== 1) solarPanel(ctx, ux + unit * 0.45, top - 3 * s, 2.4 * s, 2.2 * s, -1.4 * s, s)
    windowPane(ctx, ux + 1.2 * s, top + 1.8 * s, 1.9 * s, 2.2 * s, o.retrofit, s)
    windowPane(ctx, ux + unit - 3.1 * s, top + 1.8 * s, 1.9 * s, 2.2 * s, o.retrofit, s)
    roundRect(ctx, ux + unit / 2 - 1 * s, y - 3.8 * s, 2 * s, 3.8 * s, 0.6 * s)
    ctx.fillStyle = PALETTE.door
    ctx.fill()
  }
  if (o.heatPump) heatPumpUnit(ctx, left + unit * 3 + 0.5 * s, y, s)
}

function block(ctx: Ctx, b: Plot, x: number, y: number, s: number, o: Overlays): void {
  const w = 15 * s
  const h = 22 * s
  const left = x - w / 2
  const top = y - h
  groundShadow(ctx, x, y, 19, s)
  roundRect(ctx, left, top, w, h, 1.2 * s)
  fillOutlined(ctx, pick(WALLS, b.variant), s)
  // Flat roof seen slightly from above, where solar panels go.
  ctx.beginPath()
  ctx.moveTo(left - 0.6 * s, top + 0.6 * s)
  ctx.lineTo(left + 1.6 * s, top - 2.2 * s)
  ctx.lineTo(left + w + 1.6 * s, top - 2.2 * s)
  ctx.lineTo(left + w + 0.6 * s, top + 0.6 * s)
  ctx.closePath()
  fillOutlined(ctx, o.retrofit ? PALETTE.roofCosy : PALETTE.roofSlate, s)
  snowOnPath(ctx, top - 3 * s, top + 1 * s)
  if (o.solar) {
    for (let i = 0; i < 3; i++) solarPanel(ctx, left + 1.6 * s + i * 4.4 * s, top - 1.8 * s, 3.6 * s, 1.8 * s, 0.6 * s, s)
  }
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 3; col++) {
      // Some windows always glow; a retrofit warms them all.
      const warm = o.retrofit || (row * 3 + col + Math.floor(b.variant * 10)) % 5 === 0
      windowPane(ctx, left + 1.6 * s + col * 4.4 * s, top + 2.2 * s + row * 4.6 * s, 3 * s, 2.8 * s, warm, s)
    }
  }
  roundRect(ctx, x - 1.8 * s, y - 3.6 * s, 3.6 * s, 3.6 * s, 0.6 * s)
  ctx.fillStyle = PALETTE.door
  ctx.fill()
  if (o.heatPump) heatPumpUnit(ctx, left + w + 0.5 * s, y, s)
}

function shed(ctx: Ctx, b: Plot, x: number, y: number, s: number, o: Overlays): void {
  const w = 24 * s
  const h = 10 * s
  const left = x - w / 2
  const top = y - h
  groundShadow(ctx, x, y, 27, s)
  // Chimney first, so the sawtooth roof overlaps its base.
  roundRect(ctx, left + w * 0.78, top - 9 * s, 2.6 * s, 9.5 * s, 0.6 * s)
  fillOutlined(ctx, '#b07a5a', s)
  roundRect(ctx, left, top, w, h, 1 * s)
  fillOutlined(ctx, pick(['#d9cfc0', '#cfc6b6', '#e0d4bf'], b.variant), s)
  // Sawtooth roof with glazing.
  const teeth = 3
  const tw = w / teeth
  for (let i = 0; i < teeth; i++) {
    const tx = left + i * tw
    ctx.beginPath()
    ctx.moveTo(tx, top + 0.4 * s)
    ctx.lineTo(tx + tw, top - 5 * s)
    ctx.lineTo(tx + tw, top + 0.4 * s)
    ctx.closePath()
    fillOutlined(ctx, o.retrofit ? PALETTE.roofCosy : '#8f99a8', s)
    snowOnPath(ctx, top - 6 * s, top - 2.4 * s)
    if (o.solar) solarPanel(ctx, tx + tw * 0.15, top - 3.4 * s, tw * 0.55, 2.6 * s, tw * 0.25, s)
  }
  roundRect(ctx, x - 4 * s, y - 6 * s, 8 * s, 6 * s, 0.8 * s)
  ctx.fillStyle = '#a3866a'
  ctx.fill()
  for (let i = 0; i < 4; i++) windowPane(ctx, left + 1.4 * s + i * 5.8 * s, top + 1.6 * s, 3.6 * s, 2 * s, o.retrofit, s)
  if (o.heatPump) heatPumpUnit(ctx, left + w + 0.5 * s, y, s)
}

// Where smoke leaves a shed's chimney, in world units from the shed's plot.
export const CHIMNEY_TOP = { dx: -12 + 24 * 0.78 + 1.3, dy: -10 - 9 }

function store(ctx: Ctx, b: Plot, x: number, y: number, s: number, o: Overlays): void {
  const w = 27 * s
  const h = 10 * s
  const left = x - w / 2
  const top = y - h
  groundShadow(ctx, x, y, 30, s)
  roundRect(ctx, left, top, w, h, 1 * s)
  fillOutlined(ctx, PALETTE.wallCream, s)
  ctx.beginPath()
  ctx.moveTo(left - 0.6 * s, top + 0.6 * s)
  ctx.lineTo(left + 1.4 * s, top - 2 * s)
  ctx.lineTo(left + w + 1.4 * s, top - 2 * s)
  ctx.lineTo(left + w + 0.6 * s, top + 0.6 * s)
  ctx.closePath()
  fillOutlined(ctx, o.retrofit ? PALETTE.roofCosy : '#9aa6b5', s)
  snowOnPath(ctx, top - 3 * s, top + 1 * s)
  if (o.solar) {
    for (let i = 0; i < 5; i++) solarPanel(ctx, left + 1.6 * s + i * 5 * s, top - 1.6 * s, 4 * s, 1.5 * s, 0.6 * s, s)
  }
  roundRect(ctx, left + 1 * s, top + 1 * s, w - 2 * s, 2.4 * s, 0.6 * s)
  ctx.fillStyle = pick(['#e07a5f', '#5f9ad6', '#81b29a'], b.variant)
  ctx.fill()
  roundRect(ctx, left + 2 * s, top + 4.4 * s, w - 4 * s, h - 4.4 * s, 0.6 * s)
  ctx.fillStyle = o.retrofit ? PALETTE.windowWarm : PALETTE.window
  ctx.fill()
  if (o.heatPump) heatPumpUnit(ctx, left + w + 0.5 * s, y, s)
}

function barn(ctx: Ctx, b: Plot, x: number, y: number, s: number, o: Overlays): void {
  const w = 15 * s
  const h = 10 * s
  const left = x - w / 2
  const top = y - h
  groundShadow(ctx, x, y, 19, s)
  roundRect(ctx, left, top, w, h, 1 * s)
  fillOutlined(ctx, PALETTE.barnRed, s)
  // Gambrel roof.
  ctx.beginPath()
  ctx.moveTo(left - 1 * s, top + 0.6 * s)
  ctx.lineTo(left + 1.8 * s, top - 4 * s)
  ctx.lineTo(x, top - 6.5 * s)
  ctx.lineTo(left + w - 1.8 * s, top - 4 * s)
  ctx.lineTo(left + w + 1 * s, top + 0.6 * s)
  ctx.closePath()
  ctx.lineJoin = 'round'
  fillOutlined(ctx, o.retrofit ? PALETTE.roofCosy : '#7b5a4a', s)
  snowOnPath(ctx, top - 7 * s, top - 3.6 * s)
  if (o.solar) solarPanel(ctx, x + 0.6 * s, top - 4.6 * s, 4.4 * s, 3.4 * s, -2 * s, s)
  roundRect(ctx, x - 3 * s, y - 6.5 * s, 6 * s, 6.5 * s, 0.5 * s)
  fillOutlined(ctx, PALETTE.wallCream, s, 0.4)
  ctx.beginPath()
  ctx.moveTo(x - 3 * s, y - 6.5 * s)
  ctx.lineTo(x + 3 * s, y)
  ctx.moveTo(x + 3 * s, y - 6.5 * s)
  ctx.lineTo(x - 3 * s, y)
  ctx.strokeStyle = PALETTE.barnRed
  ctx.lineWidth = Math.max(0.6, 0.6 * s)
  ctx.stroke()
  void b
}

type Builder = (ctx: Ctx, b: Plot, x: number, y: number, s: number, o: Overlays) => void

const BUILDERS: Record<BuildingStyle, Builder> = { house, terrace, block, shed, store, barn, mudhouse, ksarTower, tent }

export function drawBuilding(ctx: Ctx, b: Building, x: number, y: number, s: number, o: Overlays = NONE): void {
  ctx.save()
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  BUILDERS[b.style](ctx, b, x, y, s, o)
  ctx.restore()
}

// --- greenery ------------------------------------------------------------------

export function tree(ctx: Ctx, x: number, y: number, s: number, variant: number, scale = 1): void {
  const k = s * scale
  groundShadow(ctx, x, y, 9 * scale, s)
  roundRect(ctx, x - 0.9 * k, y - 5 * k, 1.8 * k, 5 * k, 0.6 * k)
  ctx.fillStyle = PALETTE.trunk
  ctx.fill()
  const green = pick([PALETTE.leaf, PALETTE.leafLight, PALETTE.leafDark], variant)
  ctx.beginPath()
  ctx.arc(x - 2.4 * k, y - 6.5 * k, 3.2 * k, 0, Math.PI * 2)
  ctx.arc(x + 2.4 * k, y - 6.5 * k, 3.2 * k, 0, Math.PI * 2)
  ctx.arc(x, y - 9.5 * k, 3.8 * k, 0, Math.PI * 2)
  fillOutlined(ctx, green, s, 0.5)
  snowOnPath(ctx, y - 14 * k, y - 10.8 * k)
  // A small highlight makes the canopy look round and soft.
  circle(ctx, x - 1.2 * k, y - 10.6 * k, 1.3 * k)
  ctx.fillStyle = 'rgba(255,255,255,0.28)'
  ctx.fill()
}

function conifer(ctx: Ctx, x: number, y: number, s: number, variant: number): void {
  groundShadow(ctx, x, y, 8, s)
  roundRect(ctx, x - 0.8 * s, y - 3 * s, 1.6 * s, 3 * s, 0.4 * s)
  ctx.fillStyle = PALETTE.trunk
  ctx.fill()
  const tall = 1 + variant * 0.35
  for (let i = 0; i < 3; i++) {
    const base = y - (2.5 + i * 3.6) * s * tall
    const half = (5 - i * 1.3) * s
    ctx.beginPath()
    ctx.moveTo(x - half, base)
    ctx.lineTo(x, base - 5.2 * s * tall)
    ctx.lineTo(x + half, base)
    ctx.closePath()
    ctx.lineJoin = 'round'
    fillOutlined(ctx, i === 2 ? PALETTE.coniferTop : PALETTE.conifer, s, 0.5)
    snowOnPath(ctx, base - 5.6 * s * tall, base - 3.6 * s * tall)
  }
}

function reeds(ctx: Ctx, x: number, y: number, s: number, variant: number): void {
  ctx.lineCap = 'round'
  for (let i = 0; i < 5; i++) {
    const dx = (i - 2) * 1.2 * s
    const lean = (i - 2) * 0.6 * s + (variant - 0.5) * s
    ctx.beginPath()
    ctx.moveTo(x + dx, y)
    ctx.quadraticCurveTo(x + dx + lean * 0.3, y - 4 * s, x + dx + lean, y - 7 * s)
    ctx.strokeStyle = PALETTE.reedStem
    ctx.lineWidth = Math.max(0.6, 0.6 * s)
    ctx.stroke()
    if (i % 2 === 0) {
      roundRect(ctx, x + dx + lean - 0.5 * s, y - 8.6 * s, 1 * s, 2.4 * s, 0.5 * s)
      ctx.fillStyle = PALETTE.reedHead
      ctx.fill()
    }
  }
}

function field(ctx: Ctx, x: number, y: number, s: number, variant: number): void {
  const w = 24 * s
  const h = 9 * s
  ctx.save()
  roundRect(ctx, x - w / 2, y - h, w, h, 2.4 * s)
  ctx.fillStyle = variant > 0.5 ? PALETTE.wheat : PALETTE.crop
  ctx.fill()
  ctx.clip()
  // Furrows a shade darker than the field, whatever the season's colour.
  ctx.strokeStyle = mix(variant > 0.5 ? PALETTE.wheat : PALETTE.crop, '#5a4a2a', 0.16)
  ctx.lineWidth = Math.max(0.7, 1 * s)
  for (let i = -6; i < 8; i++) {
    ctx.beginPath()
    ctx.moveTo(x - w / 2 + i * 3.4 * s, y)
    ctx.lineTo(x - w / 2 + i * 3.4 * s + 6 * s, y - h)
    ctx.stroke()
  }
  ctx.restore()
  roundRect(ctx, x - w / 2, y - h, w, h, 2.4 * s)
  ctx.lineWidth = Math.max(0.5, 0.5 * s)
  ctx.strokeStyle = PALETTE.outline
  ctx.stroke()
}

export type GreeneryDrawer = (ctx: Ctx, x: number, y: number, s: number, variant: number) => void

const GREENERY: Record<GreeneryStyle, GreeneryDrawer> = {
  tree: (ctx, x, y, s, variant) => tree(ctx, x, y, s, variant),
  conifer,
  reeds,
  field,
  palm,
  acacia,
  millet,
}

export function drawGreenery(ctx: Ctx, g: Greenery, x: number, y: number, s: number): void {
  ctx.save()
  GREENERY[g.style](ctx, x, y, s, g.variant)
  ctx.restore()
}

export function drawCar(ctx: Ctx, c: Plot, x: number, y: number, s: number): void {
  ctx.save()
  groundShadow(ctx, x, y, 7, s)
  roundRect(ctx, x - 3.2 * s, y - 2.6 * s, 6.4 * s, 2.4 * s, 1 * s)
  fillOutlined(ctx, pick(PALETTE.carColors, c.variant), s, 0.4)
  roundRect(ctx, x - 1.8 * s, y - 4.2 * s, 3.6 * s, 1.8 * s, 0.8 * s)
  fillOutlined(ctx, PALETTE.window, s, 0.4)
  ctx.fillStyle = '#3d3a3a'
  circle(ctx, x - 1.8 * s, y - 0.2 * s, 0.8 * s)
  ctx.fill()
  circle(ctx, x + 1.8 * s, y - 0.2 * s, 0.8 * s)
  ctx.fill()
  ctx.restore()
}
