import type { Ctx } from './kit'
import { PALETTE, circle, fillOutlined, groundShadow, pick, roundRect } from './kit'
import { tree } from './buildings'
import { SAHEL_DECORATIONS } from './regions/sahel'
import { EAST_ASIA_DECORATIONS } from './regions/eastAsia'

// One small scene per project, drawn on the project's own plot (Milestone 9:
// "progress should be visible"). Some projects also change the buildings
// around them (solar panels on roofs, cosy retrofitted roofs, heat pumps by
// the walls; see Overlays in buildings.ts), and a few have a living part drawn
// every frame (turbine blades, bees, ripples; see life.ts).

export const VISUAL_IDS = [
  'garden',
  'solar',
  'retrofit',
  'heatPump',
  'energyCoop',
  'compost',
  'market',
  'safeStreets',
  'bikeShare',
  'repairCafe',
  'recycling',
  'meadow',
  'streetTrees',
  'rainGarden',
  'workshop',
  // Milestone 10 regions
  'channel',
  'cistern',
  'solarPump',
  'halfMoons',
  'saplings',
  'oasisGarden',
  'earthHouse',
  'windcatcher',
  'cookstove',
  'dripLines',
  'minigrid',
  'coppice',
  'terrace',
  'paddyFish',
  'waterwheel',
  'biogas',
  'solarHeater',
  'veggieBoxes',
  'akiyaHouse',
  'spongeLane',
] as const

export type VisualId = (typeof VISUAL_IDS)[number]

type Draw = (ctx: Ctx, x: number, y: number, s: number, variant: number) => void

function garden(ctx: Ctx, x: number, y: number, s: number): void {
  groundShadow(ctx, x, y, 20, s)
  for (const dx of [-5, 5]) {
    roundRect(ctx, x + dx * s - 4.2 * s, y - 4.4 * s, 8.4 * s, 4.4 * s, 1.2 * s)
    fillOutlined(ctx, PALETTE.soil, s)
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 2; j++) {
        circle(ctx, x + dx * s - 2.6 * s + i * 2.6 * s, y - 3.4 * s + j * 1.8 * s, 1 * s)
        ctx.fillStyle = (i + j) % 2 ? PALETTE.leafLight : PALETTE.leaf
        ctx.fill()
      }
    }
  }
  // A sunflower, because every garden needs one.
  ctx.strokeStyle = PALETTE.leafDark
  ctx.lineWidth = Math.max(0.6, 0.6 * s)
  ctx.beginPath()
  ctx.moveTo(x, y - 1 * s)
  ctx.lineTo(x, y - 8 * s)
  ctx.stroke()
  circle(ctx, x, y - 9 * s, 2 * s)
  fillOutlined(ctx, PALETTE.sun, s, 0.4)
  circle(ctx, x, y - 9 * s, 0.8 * s)
  ctx.fillStyle = PALETTE.soilDark
  ctx.fill()
}

function solarArray(ctx: Ctx, x: number, y: number, s: number): void {
  groundShadow(ctx, x, y, 18, s)
  for (const dx of [-4.5, 4.5]) {
    ctx.strokeStyle = '#8b8f94'
    ctx.lineWidth = Math.max(0.6, 0.7 * s)
    ctx.beginPath()
    ctx.moveTo(x + dx * s, y)
    ctx.lineTo(x + dx * s, y - 3 * s)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(x + dx * s - 4 * s, y - 2 * s)
    ctx.lineTo(x + dx * s - 2.6 * s, y - 6.6 * s)
    ctx.lineTo(x + dx * s + 4.2 * s, y - 6.6 * s)
    ctx.lineTo(x + dx * s + 2.8 * s, y - 2 * s)
    ctx.closePath()
    fillOutlined(ctx, PALETTE.panel, s, 0.4)
    ctx.beginPath()
    ctx.moveTo(x + dx * s - 2.4 * s, y - 5.4 * s)
    ctx.lineTo(x + dx * s + 0.6 * s, y - 5.4 * s)
    ctx.strokeStyle = 'rgba(255,255,255,0.55)'
    ctx.stroke()
  }
  // A little sun badge: this plot makes power.
  circle(ctx, x, y - 10 * s, 1.6 * s)
  ctx.fillStyle = PALETTE.sun
  ctx.fill()
}

function retrofit(ctx: Ctx, x: number, y: number, s: number): void {
  // Rolls of insulation and a ladder: the retrofit crew is at work.
  groundShadow(ctx, x, y, 16, s)
  for (let i = 0; i < 3; i++) {
    const rx = x - 4 * s + i * 3.4 * s
    roundRect(ctx, rx - 1.6 * s, y - 4.2 * s, 3.2 * s, 4.2 * s, 1.4 * s)
    fillOutlined(ctx, '#f2a7b5', s, 0.4)
    ctx.beginPath()
    ctx.ellipse(rx, y - 4.2 * s, 1.6 * s, 0.7 * s, 0, 0, Math.PI * 2)
    ctx.fillStyle = '#f7c6cf'
    ctx.fill()
  }
  ctx.strokeStyle = '#b9895c'
  ctx.lineWidth = Math.max(0.6, 0.7 * s)
  ctx.beginPath()
  ctx.moveTo(x + 6 * s, y)
  ctx.lineTo(x + 7.5 * s, y - 9 * s)
  ctx.moveTo(x + 8.5 * s, y)
  ctx.lineTo(x + 10 * s, y - 9 * s)
  for (let r = 1; r < 5; r++) {
    ctx.moveTo(x + 6 * s + r * 0.33 * s, y - r * 1.9 * s)
    ctx.lineTo(x + 8.5 * s + r * 0.33 * s, y - r * 1.9 * s)
  }
  ctx.stroke()
}

function heatPump(ctx: Ctx, x: number, y: number, s: number): void {
  groundShadow(ctx, x, y, 12, s)
  roundRect(ctx, x - 4.5 * s, y - 6 * s, 9 * s, 6 * s, 1 * s)
  fillOutlined(ctx, PALETTE.white, s)
  circle(ctx, x - 1 * s, y - 3 * s, 2.2 * s)
  ctx.fillStyle = '#e4ebf0'
  ctx.fill()
  ctx.strokeStyle = '#9fb1bf'
  ctx.lineWidth = Math.max(0.5, 0.5 * s)
  ctx.stroke()
  for (let i = 0; i < 3; i++) {
    ctx.beginPath()
    ctx.moveTo(x + 2.4 * s, y - 4.6 * s + i * 1.4 * s)
    ctx.lineTo(x + 3.8 * s, y - 4.6 * s + i * 1.4 * s)
    ctx.stroke()
  }
  // A little leaf: clean heat.
  ctx.beginPath()
  ctx.ellipse(x + 3 * s, y - 8 * s, 1.6 * s, 0.9 * s, -0.6, 0, Math.PI * 2)
  ctx.fillStyle = PALETTE.leafLight
  ctx.fill()
}

// The turbine's tower; its blades turn in life.ts (turbineHub gives the hub).
function energyCoop(ctx: Ctx, x: number, y: number, s: number): void {
  groundShadow(ctx, x, y, 8, s)
  ctx.beginPath()
  ctx.moveTo(x - 1.3 * s, y)
  ctx.lineTo(x - 0.5 * s, y - 22 * s)
  ctx.lineTo(x + 0.5 * s, y - 22 * s)
  ctx.lineTo(x + 1.3 * s, y)
  ctx.closePath()
  fillOutlined(ctx, '#f4f6f7', s, 0.5)
  roundRect(ctx, x - 1.6 * s, y - 23.4 * s, 3.4 * s, 2 * s, 0.8 * s)
  fillOutlined(ctx, '#e8edf0', s, 0.4)
}

export function turbineHub(x: number, y: number, s: number): { x: number; y: number } {
  return { x: x - 1.6 * s, y: y - 22.4 * s }
}

function compost(ctx: Ctx, x: number, y: number, s: number): void {
  groundShadow(ctx, x, y, 18, s)
  for (let i = 0; i < 3; i++) {
    const bx = x - 7.5 * s + i * 5.2 * s
    roundRect(ctx, bx, y - 5 * s, 4.6 * s, 5 * s, 0.6 * s)
    fillOutlined(ctx, '#b98a5e', s, 0.5)
    ctx.strokeStyle = '#8f6440'
    ctx.lineWidth = Math.max(0.5, 0.4 * s)
    for (let k = 1; k < 3; k++) {
      ctx.beginPath()
      ctx.moveTo(bx, y - 5 * s + k * 1.7 * s)
      ctx.lineTo(bx + 4.6 * s, y - 5 * s + k * 1.7 * s)
      ctx.stroke()
    }
    ctx.beginPath()
    ctx.ellipse(bx + 2.3 * s, y - 5 * s, 2.1 * s, 0.9 * s, 0, Math.PI, 0)
    ctx.fillStyle = PALETTE.soilDark
    ctx.fill()
  }
  // A sprout on top of the middle bin.
  ctx.beginPath()
  ctx.ellipse(x + 0.3 * s, y - 7 * s, 1.2 * s, 0.6 * s, -0.5, 0, Math.PI * 2)
  ctx.fillStyle = PALETTE.leafLight
  ctx.fill()
}

function stall(ctx: Ctx, x: number, y: number, s: number, stripe: string): void {
  roundRect(ctx, x - 4 * s, y - 3.6 * s, 8 * s, 3.6 * s, 0.6 * s)
  fillOutlined(ctx, '#c99a6b', s, 0.4)
  for (const [i, c] of ['#e07a5f', '#ffd34d', '#81b29a', '#f28ab2'].entries()) {
    circle(ctx, x - 2.7 * s + i * 1.8 * s, y - 4.2 * s, 0.9 * s)
    ctx.fillStyle = c
    ctx.fill()
  }
  ctx.strokeStyle = '#8f6440'
  ctx.lineWidth = Math.max(0.5, 0.5 * s)
  ctx.beginPath()
  ctx.moveTo(x - 3.6 * s, y - 3.6 * s)
  ctx.lineTo(x - 3.6 * s, y - 8 * s)
  ctx.moveTo(x + 3.6 * s, y - 3.6 * s)
  ctx.lineTo(x + 3.6 * s, y - 8 * s)
  ctx.stroke()
  for (let i = 0; i < 4; i++) {
    ctx.beginPath()
    ctx.moveTo(x - 4.6 * s + i * 2.3 * s, y - 8 * s)
    ctx.lineTo(x - 4.6 * s + (i + 1) * 2.3 * s, y - 8 * s)
    ctx.lineTo(x - 4.6 * s + (i + 1) * 2.3 * s, y - 9.6 * s)
    ctx.quadraticCurveTo(x - 4.6 * s + (i + 0.5) * 2.3 * s, y - 10.6 * s, x - 4.6 * s + i * 2.3 * s, y - 9.6 * s)
    ctx.closePath()
    ctx.fillStyle = i % 2 ? PALETTE.awningCream : stripe
    ctx.fill()
  }
}

function market(ctx: Ctx, x: number, y: number, s: number): void {
  groundShadow(ctx, x, y, 22, s)
  stall(ctx, x - 5 * s, y, s, PALETTE.awningRed)
  stall(ctx, x + 5 * s, y + 1 * s, s, '#5fae5a')
}

function bike(ctx: Ctx, x: number, y: number, s: number, frame: string): void {
  ctx.strokeStyle = '#3d3a3a'
  ctx.lineWidth = Math.max(0.5, 0.45 * s)
  circle(ctx, x - 1.8 * s, y - 1.3 * s, 1.3 * s)
  ctx.stroke()
  circle(ctx, x + 1.8 * s, y - 1.3 * s, 1.3 * s)
  ctx.stroke()
  ctx.strokeStyle = frame
  ctx.lineWidth = Math.max(0.6, 0.6 * s)
  ctx.beginPath()
  ctx.moveTo(x - 1.8 * s, y - 1.3 * s)
  ctx.lineTo(x - 0.3 * s, y - 3.3 * s)
  ctx.lineTo(x + 1.4 * s, y - 3.3 * s)
  ctx.lineTo(x + 1.8 * s, y - 1.3 * s)
  ctx.moveTo(x - 0.3 * s, y - 3.3 * s)
  ctx.lineTo(x, y - 1.3 * s)
  ctx.lineTo(x + 1.4 * s, y - 3.3 * s)
  ctx.stroke()
}

function safeStreets(ctx: Ctx, x: number, y: number, s: number): void {
  // A curving path with a green bike lane and white dashes.
  ctx.save()
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(x - 11 * s, y - 1 * s)
  ctx.quadraticCurveTo(x, y - 6 * s, x + 11 * s, y - 2 * s)
  ctx.strokeStyle = PALETTE.path
  ctx.lineWidth = 5 * s
  ctx.stroke()
  ctx.strokeStyle = PALETTE.bikeLane
  ctx.lineWidth = 2.2 * s
  ctx.stroke()
  ctx.setLineDash([1.6 * s, 1.6 * s])
  ctx.strokeStyle = PALETTE.white
  ctx.lineWidth = 0.5 * s
  ctx.stroke()
  ctx.restore()
  bike(ctx, x - 2 * s, y - 2.6 * s, s, '#e07a5f')
  tree(ctx, x + 8 * s, y + 1.5 * s, s, 0.3, 0.6)
}

function bikeShare(ctx: Ctx, x: number, y: number, s: number): void {
  groundShadow(ctx, x, y, 18, s)
  ctx.strokeStyle = '#8b8f94'
  ctx.lineWidth = Math.max(0.6, 0.6 * s)
  ctx.beginPath()
  ctx.moveTo(x - 8 * s, y - 2.4 * s)
  ctx.lineTo(x + 8 * s, y - 2.4 * s)
  ctx.stroke()
  const colors = ['#e07a5f', '#5f9ad6', '#f2c94c', '#5fae5a']
  for (let i = 0; i < 4; i++) bike(ctx, x - 6 * s + i * 4 * s, y, s, colors[i])
  // A sign post with a bike symbol.
  roundRect(ctx, x + 8.4 * s, y - 9 * s, 3.6 * s, 3.6 * s, 0.8 * s)
  fillOutlined(ctx, '#5f9ad6', s, 0.4)
  ctx.strokeStyle = '#8b8f94'
  ctx.beginPath()
  ctx.moveTo(x + 10.2 * s, y - 5.4 * s)
  ctx.lineTo(x + 10.2 * s, y)
  ctx.stroke()
}

function smallShop(ctx: Ctx, x: number, y: number, s: number, wall: string, sign: string, icon: (cx: number, cy: number) => void): void {
  groundShadow(ctx, x, y, 16, s)
  roundRect(ctx, x - 6 * s, y - 8 * s, 12 * s, 8 * s, 1 * s)
  fillOutlined(ctx, wall, s)
  ctx.beginPath()
  ctx.moveTo(x - 7.4 * s, y - 7.6 * s)
  ctx.lineTo(x, y - 12.5 * s)
  ctx.lineTo(x + 7.4 * s, y - 7.6 * s)
  ctx.closePath()
  ctx.lineJoin = 'round'
  fillOutlined(ctx, PALETTE.roofTerracotta, s)
  roundRect(ctx, x - 1.4 * s, y - 4.4 * s, 2.8 * s, 4.4 * s, 0.6 * s)
  ctx.fillStyle = PALETTE.door
  ctx.fill()
  roundRect(ctx, x - 5 * s, y - 6 * s, 2.6 * s, 2.4 * s, 0.5 * s)
  ctx.fillStyle = PALETTE.windowWarm
  ctx.fill()
  // Round sign hanging on the right, with the shop's icon.
  circle(ctx, x + 4 * s, y - 5 * s, 2.2 * s)
  fillOutlined(ctx, sign, s, 0.4)
  icon(x + 4 * s, y - 5 * s)
}

function repairCafe(ctx: Ctx, x: number, y: number, s: number): void {
  smallShop(ctx, x, y, s, PALETTE.wallMint, PALETTE.white, (cx, cy) => {
    ctx.strokeStyle = '#6f7c8f'
    ctx.lineWidth = Math.max(0.6, 0.7 * s)
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(cx - 1 * s, cy + 1 * s)
    ctx.lineTo(cx + 0.8 * s, cy - 0.8 * s)
    ctx.stroke()
    circle(ctx, cx + 1 * s, cy - 1 * s, 0.6 * s)
    ctx.stroke()
  })
}

function workshop(ctx: Ctx, x: number, y: number, s: number): void {
  smallShop(ctx, x, y, s, PALETTE.wallSky, PALETTE.white, (cx, cy) => {
    circle(ctx, cx, cy - 0.3 * s, 1.1 * s)
    ctx.fillStyle = PALETTE.sun
    ctx.fill()
    roundRect(ctx, cx - 0.6 * s, cy + 0.6 * s, 1.2 * s, 0.9 * s, 0.2 * s)
    ctx.fillStyle = '#8b8f94'
    ctx.fill()
  })
}

function recycling(ctx: Ctx, x: number, y: number, s: number): void {
  groundShadow(ctx, x, y, 16, s)
  for (let i = 0; i < 3; i++) {
    const bx = x - 6 * s + i * 4.2 * s
    roundRect(ctx, bx - 1.8 * s, y - 5.2 * s, 3.6 * s, 5.2 * s, 0.8 * s)
    fillOutlined(ctx, PALETTE.binColors[i], s, 0.4)
    roundRect(ctx, bx - 2.1 * s, y - 6 * s, 4.2 * s, 1.1 * s, 0.5 * s)
    fillOutlined(ctx, PALETTE.binColors[i], s, 0.4)
    // A tiny recycling loop on each bin.
    ctx.beginPath()
    ctx.arc(bx, y - 2.8 * s, 0.9 * s, 0.3, Math.PI * 1.8)
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'
    ctx.lineWidth = Math.max(0.5, 0.4 * s)
    ctx.stroke()
  }
}

function meadow(ctx: Ctx, x: number, y: number, s: number, variant: number): void {
  ctx.beginPath()
  ctx.ellipse(x, y - 2 * s, 11 * s, 4.4 * s, 0, 0, Math.PI * 2)
  ctx.fillStyle = '#9fd17f'
  ctx.fill()
  // Deterministic flower scatter (variant seeds the pattern).
  let seed = Math.floor(variant * 1000) + 7
  const next = () => {
    seed = (seed * 9301 + 49297) % 233280
    return seed / 233280
  }
  for (let i = 0; i < 22; i++) {
    const a = next() * Math.PI * 2
    const d = Math.sqrt(next())
    const fx = x + Math.cos(a) * d * 9.5 * s
    const fy = y - 2 * s + Math.sin(a) * d * 3.6 * s
    ctx.strokeStyle = PALETTE.leafDark
    ctx.lineWidth = Math.max(0.4, 0.3 * s)
    ctx.beginPath()
    ctx.moveTo(fx, fy)
    ctx.lineTo(fx, fy - 1.4 * s)
    ctx.stroke()
    circle(ctx, fx, fy - 1.6 * s, 0.8 * s)
    ctx.fillStyle = pick(PALETTE.flowerColors, next())
    ctx.fill()
  }
}

function streetTrees(ctx: Ctx, x: number, y: number, s: number): void {
  for (let i = 0; i < 3; i++) tree(ctx, x - 7 * s + i * 7 * s, y - (i % 2) * 1.5 * s, s, (i * 0.37) % 1, 0.75)
}

function rainGarden(ctx: Ctx, x: number, y: number, s: number): void {
  ctx.beginPath()
  ctx.ellipse(x, y - 2.5 * s, 10 * s, 4 * s, 0, 0, Math.PI * 2)
  ctx.fillStyle = '#a7c98a'
  ctx.fill()
  ctx.beginPath()
  ctx.ellipse(x - 1 * s, y - 2.6 * s, 7 * s, 2.6 * s, 0, 0, Math.PI * 2)
  fillOutlined(ctx, PALETTE.water, s, 0.4)
  ctx.beginPath()
  ctx.ellipse(x - 2.5 * s, y - 3.2 * s, 2.4 * s, 0.7 * s, 0, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(255,255,255,0.45)'
  ctx.fill()
  // Stones and reeds around the edge.
  for (const [dx, dy] of [
    [6.5, -1.2],
    [-7.5, -1.8],
    [3, 0.2],
  ]) {
    ctx.beginPath()
    ctx.ellipse(x + dx * s, y + dy * s, 1.2 * s, 0.8 * s, 0, 0, Math.PI * 2)
    ctx.fillStyle = '#b8b4a8'
    ctx.fill()
  }
  ctx.strokeStyle = '#6f9a4f'
  ctx.lineWidth = Math.max(0.5, 0.5 * s)
  for (let i = 0; i < 4; i++) {
    ctx.beginPath()
    ctx.moveTo(x + 7 * s + i * 0.8 * s, y - 1.5 * s)
    ctx.lineTo(x + 7.4 * s + i * 1 * s, y - 6 * s)
    ctx.stroke()
  }
}

// A project being built (construction time): wooden scaffolding, a stack of
// crates, a little yellow crane and a cone. Its progress ring is drawn live.
export function drawConstruction(ctx: Ctx, x: number, y: number, s: number, variant: number): void {
  ctx.save()
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  groundShadow(ctx, x, y, 20, s)
  // Scaffolding: two levels of poles and planks.
  ctx.strokeStyle = '#b9895c'
  ctx.lineWidth = Math.max(0.7, 0.7 * s)
  ctx.beginPath()
  for (const dx of [-7, -2, 3]) {
    ctx.moveTo(x + dx * s, y)
    ctx.lineTo(x + dx * s, y - 9 * s)
  }
  for (const dy of [-3, -6, -9]) {
    ctx.moveTo(x - 7.5 * s, y + dy * s)
    ctx.lineTo(x + 3.5 * s, y + dy * s)
  }
  ctx.moveTo(x - 7 * s, y)
  ctx.lineTo(x - 2 * s, y - 6 * s)
  ctx.moveTo(x - 2 * s, y)
  ctx.lineTo(x + 3 * s, y - 6 * s)
  ctx.stroke()
  // Planks.
  for (const dy of [-3, -6]) {
    roundRect(ctx, x - 7.6 * s, y + (dy - 0.6) * s, 11.2 * s, 1.2 * s, 0.4 * s)
    ctx.fillStyle = '#d9b48a'
    ctx.fill()
  }
  // Crates.
  for (const [dx, dy] of [
    [5, 0],
    [7.6, 0],
    [6.3, -2.4],
  ]) {
    roundRect(ctx, x + dx * s - 1.2 * s, y + dy * s - 2.4 * s, 2.4 * s, 2.4 * s, 0.3 * s)
    fillOutlined(ctx, '#c99a6b', s, 0.35)
  }
  // A little crane: mast, jib, counterweight, cable and hook.
  const mastX = x + 9.5 * s
  ctx.strokeStyle = '#e0a82e'
  ctx.lineWidth = Math.max(0.8, 0.9 * s)
  ctx.beginPath()
  ctx.moveTo(mastX, y)
  ctx.lineTo(mastX, y - 16 * s)
  ctx.moveTo(mastX - 9 * s, y - 15 * s)
  ctx.lineTo(mastX + 3 * s, y - 15 * s)
  ctx.stroke()
  roundRect(ctx, mastX + 1.6 * s, y - 15.8 * s, 2 * s, 1.8 * s, 0.3 * s)
  ctx.fillStyle = '#6f7c8f'
  ctx.fill()
  const hookX = mastX - 6 * s - variant * 2 * s
  ctx.strokeStyle = '#5a5a5a'
  ctx.lineWidth = Math.max(0.4, 0.3 * s)
  ctx.beginPath()
  ctx.moveTo(hookX, y - 15 * s)
  ctx.lineTo(hookX, y - 10.5 * s)
  ctx.stroke()
  roundRect(ctx, hookX - 0.9 * s, y - 10.6 * s, 1.8 * s, 1.4 * s, 0.3 * s)
  fillOutlined(ctx, '#c99a6b', s, 0.3)
  // A traffic cone.
  ctx.beginPath()
  ctx.moveTo(x - 10 * s, y)
  ctx.lineTo(x - 9 * s, y - 3 * s)
  ctx.lineTo(x - 8 * s, y)
  ctx.closePath()
  ctx.fillStyle = '#ef7d3c'
  ctx.fill()
  ctx.restore()
}

// The progress ring above a project being built (drawn every frame).
export function drawBuildRing(ctx: Ctx, x: number, y: number, s: number, progress: number): void {
  const r = 3 * s
  const cy = y - 21 * s
  ctx.save()
  circle(ctx, x, cy, r + 1.2 * s)
  ctx.fillStyle = 'rgba(255,255,255,0.92)'
  ctx.fill()
  ctx.beginPath()
  ctx.arc(x, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0.02, Math.min(1, progress)))
  ctx.strokeStyle = '#3f6a3a'
  ctx.lineWidth = Math.max(1.2, 1.1 * s)
  ctx.lineCap = 'round'
  ctx.stroke()
  ctx.restore()
}

export const DECORATIONS: Record<VisualId, Draw> = {
  garden,
  solar: solarArray,
  retrofit,
  heatPump,
  energyCoop,
  compost,
  market,
  safeStreets,
  bikeShare,
  repairCafe,
  recycling,
  meadow,
  streetTrees,
  rainGarden,
  workshop,
  ...SAHEL_DECORATIONS,
  ...EAST_ASIA_DECORATIONS,
}

export function drawDecoration(ctx: Ctx, visual: VisualId, x: number, y: number, s: number, variant: number): void {
  ctx.save()
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  DECORATIONS[visual](ctx, x, y, s, variant)
  ctx.restore()
}
