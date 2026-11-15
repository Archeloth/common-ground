import type { GameState, NeighborhoodDef, Needs } from '../../../game/types'
import { loadProjects, projectById } from '../../../game/projects'
import { isExpired } from '../../../game/expiry'
import { blobPoints } from '../../../game/blob'
import { satisfactionOf } from '../../../game/satisfaction'
import { KIND_COLORS, shade } from '../colors'
import { buildPath2D, drawRaisedBlob } from '../draw'
import type { Overlays } from '../sprites/buildings'
import { drawBuilding, drawCar, drawGreenery } from '../sprites/buildings'
import { drawConstruction, drawDecoration } from '../sprites/decorations'
import type { VisualId } from '../sprites/decorations'
import { SPRITE_SCALE, mix } from '../sprites/kit'
import { layoutFor } from './layout'
import type { SeasonLook } from './season'
import { SEASON_LOOKS, applySeason, seasonalGround } from './season'
import { seasonOfDay } from '../../../game/calendar'

// What a district looks like right now (Milestone 9), and a cached picture of
// it. The picture is redrawn only when its look changes (projects, lapses,
// satisfaction band, parked cars, season) or the zoom moves to another bucket, so a
// frame is mostly sixteen image copies plus the small living layer.

export interface SlotLook {
  projectId: string
  visual: VisualId
  expired: boolean
  building: number | null // 0..1 while under construction, else null
}

export interface DistrictLook {
  slots: Array<SlotLook | null>
  overlays: Overlays
  satisfaction: number
  needs: Needs
  carsShown: number
  season: SeasonLook
  key: string // changes exactly when the cached picture must change
}

export function districtLook(state: GameState, n: NeighborhoodDef): DistrictLook {
  const projects = loadProjects()
  const ids = state.projects[n.id] ?? []
  const slots: Array<SlotLook | null> = []
  const overlays: Overlays = { solar: false, retrofit: false, heatPump: false }
  for (let i = 0; i < n.slots; i++) {
    const id = ids[i] ?? null
    if (id === null) {
      slots.push(null)
      continue
    }
    const def = projectById(projects, id)
    const visual = def.visual as VisualId
    const expired = isExpired(state, n.id, i)
    const ready = state.projectReady?.[n.id]?.[i] ?? null
    const building =
      ready !== null && state.day < ready
        ? Math.min(1, Math.max(0, 1 - (ready - state.day) / Math.max(1, def.buildDays)))
        : null
    slots.push({ projectId: id, visual, expired, building })
    const working = !expired && building === null
    if (working && visual === 'solar') overlays.solar = true
    if (working && visual === 'retrofit') overlays.retrofit = true
    if (working && visual === 'heatPump') overlays.heatPump = true
  }
  const sim = state.neighborhoods[n.id]
  const needs = sim?.needs ?? n.needs
  const satisfaction = sim?.satisfaction ?? satisfactionOf(n.needs)
  // Fewer parked cars as walking, cycling and buses take over.
  const cars = layoutFor(n).cars.length
  const carsShown = Math.round(cars * Math.min(1, Math.max(0, (0.95 - needs.mobility) * 2)))
  const band = Math.round(satisfaction / 4)
  const slotKey = slots
    .map((s) => (s ? `${s.building !== null ? 'build' : s.visual}${s.expired ? '~' : ''}` : '-'))
    .join(',')
  const season = SEASON_LOOKS[seasonOfDay(state.day)]
  const key = `${slotKey}|${overlays.solar ? 1 : 0}${overlays.retrofit ? 1 : 0}${overlays.heatPump ? 1 : 0}|${band}|${carsShown}|${season.season}`
  return { slots, overlays, satisfaction, needs, carsShown, season, key }
}

// The district's ground colour: dusty when unhappy, vivid when content.
export function groundColour(n: NeighborhoodDef, satisfaction: number): string {
  const vivid = KIND_COLORS[n.kind]
  const dusty = mix(vivid, '#b9b5a6', 0.55)
  const t = Math.min(1, Math.max(0, (satisfaction - 40) / 35))
  return mix(dusty, vivid, t)
}

export interface DistrictCache {
  canvas: HTMLCanvasElement
  originX: number // world coordinates of the canvas's top-left corner
  originY: number
  scale: number // canvas pixels per world unit
  key: string
}

const RAISED_DEPTH_CSS = 6

// World-space box that holds the blob and everything standing on it.
function bounds(n: NeighborhoodDef): { x: number; y: number; w: number; h: number } {
  const r = n.shape.radius
  return {
    x: n.shape.x - r * 1.55,
    y: n.shape.y - r * 0.6 * 1.55 - 34,
    w: r * 3.1,
    h: r * 0.6 * 3.1 + 34 + 16,
  }
}

// Draw one district (ground, buildings, greenery, cars, projects) into its own
// canvas. `hidden` slots are popping in and are drawn live instead.
export function renderDistrict(
  n: NeighborhoodDef,
  look: DistrictLook,
  scale: number,
  dpr: number,
  hidden: ReadonlySet<number>,
  key: string,
  reuse?: HTMLCanvasElement,
): DistrictCache {
  const box = bounds(n)
  const canvas = reuse ?? document.createElement('canvas')
  canvas.width = Math.max(1, Math.ceil(box.w * scale))
  canvas.height = Math.max(1, Math.ceil(box.h * scale))
  const ctx = canvas.getContext('2d')!
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  const toX = (wx: number) => (wx - box.x) * scale
  const toY = (wy: number) => (wy - box.y) * scale

  const outline = blobPoints(n.shape.seed, n.shape.x, n.shape.y, n.shape.radius)
  const path = buildPath2D(outline.map((p) => ({ x: toX(p.x), y: toY(p.y) })))
  applySeason(look.season)
  const top = seasonalGround(groundColour(n, look.satisfaction), look.season)
  drawRaisedBlob(ctx, path, top, shade(top, -25), 0, Math.round(RAISED_DEPTH_CSS * dpr))
  // A soft inner highlight so the island looks rounded.
  ctx.save()
  ctx.clip(path)
  const gradient = ctx.createRadialGradient(
    toX(n.shape.x - n.shape.radius * 0.3),
    toY(n.shape.y - n.shape.radius * 0.25),
    0,
    toX(n.shape.x),
    toY(n.shape.y),
    n.shape.radius * scale * 1.1,
  )
  gradient.addColorStop(0, 'rgba(255,255,255,0.22)')
  gradient.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = gradient
  ctx.fill(path)
  ctx.restore()

  const layout = layoutFor(n)
  const s = scale * SPRITE_SCALE
  // Fields lie flat, so they go down first.
  for (const g of layout.greenery) if (g.style === 'field') drawGreenery(ctx, g, toX(g.x), toY(g.y), s)

  const items: Array<{ y: number; draw: () => void }> = []
  layout.buildings.forEach((b) => {
    // Solar on most roofs, heat pumps by many walls; retrofits warm every home.
    const overlays: Overlays = {
      solar: look.overlays.solar && b.variant < 0.7,
      retrofit: look.overlays.retrofit,
      heatPump: look.overlays.heatPump && b.variant > 0.3,
    }
    items.push({ y: b.y, draw: () => drawBuilding(ctx, b, toX(b.x), toY(b.y), s, overlays) })
  })
  for (const g of layout.greenery) {
    if (g.style !== 'field') items.push({ y: g.y, draw: () => drawGreenery(ctx, g, toX(g.x), toY(g.y), s) })
  }
  layout.cars.slice(0, look.carsShown).forEach((c) => {
    items.push({ y: c.y, draw: () => drawCar(ctx, c, toX(c.x), toY(c.y), s) })
  })
  layout.slots.forEach((plot, i) => {
    const slot = look.slots[i]
    if (hidden.has(i)) return
    items.push({
      y: plot.y,
      draw: () => {
        const x = toX(plot.x)
        const y = toY(plot.y)
        if (!slot) {
          // An open plot: a soft dotted ring says "room for a project here".
          ctx.save()
          ctx.setLineDash([1.6 * s, 1.6 * s])
          ctx.beginPath()
          ctx.ellipse(x, y - 1 * s, 7 * s, 2.8 * s, 0, 0, Math.PI * 2)
          ctx.strokeStyle = 'rgba(255,255,255,0.75)'
          ctx.lineWidth = Math.max(0.8, 0.6 * s)
          ctx.stroke()
          ctx.restore()
          return
        }
        ctx.save()
        if (slot.expired) {
          // A lapsed project fades and greys until it is renewed.
          ctx.globalAlpha = 0.5
          ctx.filter = 'grayscale(0.85)'
        }
        if (slot.building !== null) drawConstruction(ctx, x, y, s, plot.variant)
        else drawDecoration(ctx, slot.visual, x, y, s, plot.variant)
        ctx.restore()
      },
    })
  })
  items.sort((a, b) => a.y - b.y)
  for (const item of items) item.draw()

  return { canvas, originX: box.x, originY: box.y, scale, key }
}
