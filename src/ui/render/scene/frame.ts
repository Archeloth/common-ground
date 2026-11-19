import type { NeedId, NeighborhoodDef, ScenarioDef } from '../../../game/types'
import type { Point } from '../../../game/geometry'
import { bridgeBetween, neighborhoodById } from '../../../game/scenario'
import { districtOutline } from '../../../game/outline'
import type { Camera } from '../camera'
import { worldToScreen } from '../camera'
import { COLORS, NEED_COLORS } from '../colors'
import { buildPath2D, drawBadge, drawBridge, drawBusLine, drawPulseRing, drawRiver } from '../draw'
import { CHIMNEY_TOP } from '../sprites/buildings'
import { drawBuildRing, drawDecoration, turbineHub } from '../sprites/decorations'
import type { VisualId } from '../sprites/decorations'
import { SPRITE_SCALE } from '../sprites/kit'
import { bees, bird, bus, butterfly, floatingLabel, popScale, ripple, smoke, sparkles, turbineBlades, valuePill } from '../sprites/life'
import { drawSpecies } from '../sprites/wildlife'
import type { DistrictCache, DistrictLook } from './district'
import { renderDistrict } from './district'
import { layoutFor } from './layout'
import { SEASON_LOOKS, applySeason, seasonalGround } from './season'
import type { SeasonLook } from './season'
import { alongRiver, wildsFor } from './wilds'
import { duck, leapingFish } from '../sprites/wilds'
import { drawCountryside } from './countryside'

// One frame of the town (Milestone 9). The static part of each district comes
// from its cache; everything that moves is drawn live on top.

export const POP_MS = 450
export const FLOAT_MS = 1600

export interface Pop {
  neighborhood: string
  slot: number
  visual: VisualId
  born: number // performance.now() when the project appeared
}

export interface Floater {
  neighborhood: string
  slot: number
  text: string
  colour: string
  born: number
  row: number // stacked rows, so several labels never overlap
}

export interface FrameInput {
  scenario: ScenarioDef
  cam: Camera
  cssWidth: number
  cssHeight: number
  dpr: number
  now: number // ms (performance.now)
  busTime: number // seconds of running game time: buses stop while paused
  reducedMotion: boolean
  looks: Map<string, DistrictLook>
  lifts: Map<string, number> // smoothed hover lift per district, in px
  busLines: Array<[string, string]>
  selectedId: string | null
  pulseIds: string[]
  expiredIds: string[]
  pops: Pop[]
  floaters: Floater[]
  highlightNeed: NeedId | null // hovering a town-wide need in the Town overview
}

const caches = new Map<string, DistrictCache>()
const outlines = new Map<string, Point[]>()

function outlineOf(scenario: ScenarioDef, n: NeighborhoodDef): Point[] {
  const key = `${scenario.id}/${n.id}`
  let points = outlines.get(key)
  if (!points) {
    points = districtOutline(scenario, n.id)
    outlines.set(key, points)
  }
  return points
}

// Caches are drawn at a zoom "bucket" a little above the real zoom (steps of
// about 19%), so they are always sharp and are not rebuilt on every wheel tick.
export function zoomBucket(zoom: number): number {
  return 2 ** (Math.ceil(Math.log2(zoom) * 4) / 4)
}

function routeOf(scenario: ScenarioDef, a: string, b: string): Point[] {
  const from = neighborhoodById(scenario, a).shape
  const to = neighborhoodById(scenario, b).shape
  const bridge = bridgeBetween(scenario, a, b)
  return bridge ? [from, bridge.point, to] : [from, to]
}

// Position along a polyline, ping-ponging: u in [0, 2).
function alongRoute(route: Point[], u: number): { x: number; y: number; dir: number } {
  const forward = u < 1
  const p = forward ? u : 2 - u
  const lengths = route.slice(1).map((pt, i) => Math.hypot(pt.x - route[i].x, pt.y - route[i].y))
  const total = lengths.reduce((a, b) => a + b, 0)
  let d = p * total
  for (let i = 0; i < lengths.length; i++) {
    if (d <= lengths[i] || i === lengths.length - 1) {
      const k = lengths[i] === 0 ? 0 : d / lengths[i]
      const a = route[i]
      const b = route[i + 1]
      const dx = b.x - a.x
      return { x: a.x + dx * k, y: a.y + (b.y - a.y) * k, dir: (dx >= 0 ? 1 : -1) * (forward ? 1 : -1) }
    }
    d -= lengths[i]
  }
  return { x: route[0].x, y: route[0].y, dir: 1 }
}

// Returns false when the frame is still incomplete (countryside tiles being
// built), so a loop that only draws when dirty knows to draw again.
export function drawFrame(ctx: CanvasRenderingContext2D, f: FrameInput): boolean {
  const { cam, scenario } = f
  const t = f.reducedMotion ? 3 : f.now / 1000
  const s = cam.zoom * SPRITE_SCALE

  ctx.setTransform(f.dpr, 0, 0, f.dpr, 0, 0)
  // Every district shares the season; the live layer draws in it too.
  const season = f.looks.values().next().value?.season ?? SEASON_LOOKS.summer
  applySeason(season)
  const complete = drawBackground(ctx, f, season)
  drawRiverLife(ctx, f, season, t, s)

  // Districts back to front, each from its cache (rebuilt when its look changes).
  const bucket = zoomBucket(cam.zoom)
  const cacheScale = bucket * f.dpr
  const popping = new Map<string, Set<number>>()
  for (const pop of f.pops) {
    if (f.now - pop.born >= POP_MS) continue
    if (!popping.has(pop.neighborhood)) popping.set(pop.neighborhood, new Set())
    popping.get(pop.neighborhood)!.add(pop.slot)
  }
  const ordered = [...scenario.neighborhoods].sort((a, b) => a.shape.y - b.shape.y)
  for (const n of ordered) {
    const look = f.looks.get(n.id)
    if (!look) continue
    const hidden = popping.get(n.id) ?? new Set<number>()
    const key = `${look.key}|${cacheScale.toFixed(3)}|${[...hidden].join('.')}`
    const cacheId = `${scenario.id}/${n.id}`
    let cache = caches.get(cacheId)
    if (!cache || cache.key !== key) {
      cache = renderDistrict(n, look, cacheScale, f.dpr, hidden, key, cache?.canvas)
      caches.set(cacheId, cache)
    }
    const lift = f.lifts.get(n.id) ?? 0
    const k = cam.zoom / bucket
    ctx.drawImage(
      cache.canvas,
      (cache.originX - cam.x) * cam.zoom,
      (cache.originY - cam.y) * cam.zoom - lift,
      (cache.canvas.width / f.dpr) * k,
      (cache.canvas.height / f.dpr) * k,
    )
    drawLife(ctx, f, n, look, lift, t, s)
  }

  // The selection outline goes on top: districts now share borders, so the
  // neighbour drawn next would otherwise cover half of it.
  if (f.selectedId) {
    const n = neighborhoodById(scenario, f.selectedId)
    const lift = f.lifts.get(n.id) ?? 0
    const path = buildPath2D(outlineOf(scenario, n).map((p) => worldToScreen(cam, p.x, p.y - lift / cam.zoom)))
    ctx.strokeStyle = COLORS.selectedStroke
    ctx.lineWidth = 3
    ctx.lineJoin = 'round'
    ctx.stroke(path)
  }

  // Bus routes go over the districts they link: districts share borders now,
  // so there are no gaps left for a route drawn underneath to show through.
  for (const [a, b] of f.busLines) drawBusLine(ctx, cam, routeOf(scenario, a, b))

  // Buses drive along their lines, across the bridges.
  for (const [a, b] of f.busLines) {
    const route = routeOf(scenario, a, b)
    const total = route.slice(1).reduce((sum, pt, i) => sum + Math.hypot(pt.x - route[i].x, pt.y - route[i].y), 0)
    const speed = 16 // world units per second
    const seed = (a.length * 31 + b.length * 17) % 10
    const bt = f.reducedMotion ? 3 : f.busTime
    const u = ((bt * speed) / Math.max(1, total) + seed / 10) % 2
    const pos = alongRoute(route, u)
    const screen = worldToScreen(cam, pos.x, pos.y)
    bus(ctx, screen.x, screen.y - 3 * s, s, pos.dir, bt)
  }

  for (const id of f.expiredIds) {
    const n = neighborhoodById(scenario, id)
    drawBadge(ctx, cam, n.shape, n.shape.radius, '⌛')
  }
  for (const id of f.pulseIds) {
    const n = neighborhoodById(scenario, id)
    drawPulseRing(ctx, cam, n.shape, n.shape.radius, f.reducedMotion ? 250 : f.now)
  }

  // Hovering a town-wide need: a soft veil, every district outlined in the
  // need's colour, and a pill with that district's own value.
  if (f.highlightNeed) {
    const need = f.highlightNeed
    ctx.fillStyle = 'rgba(251, 252, 247, 0.35)'
    ctx.fillRect(0, 0, f.cssWidth, f.cssHeight)
    for (const n of scenario.neighborhoods) {
      const look = f.looks.get(n.id)
      if (!look) continue
      const lift = f.lifts.get(n.id) ?? 0
      const path = buildPath2D(outlineOf(scenario, n).map((p) => worldToScreen(cam, p.x, p.y - lift / cam.zoom)))
      ctx.strokeStyle = NEED_COLORS[need]
      ctx.lineWidth = 2.5
      ctx.lineJoin = 'round'
      ctx.stroke(path)
      const centre = worldToScreen(cam, n.shape.x, n.shape.y - n.shape.radius * 0.1)
      valuePill(ctx, centre.x, centre.y - lift, look.needs[need], NEED_COLORS[need])
    }
  }

  // Floating "+12% Food" labels over the districts that just gained a project.
  for (const floater of f.floaters) {
    const progress = (f.now - floater.born) / FLOAT_MS
    if (progress < 0 || progress >= 1) continue
    const n = neighborhoodById(scenario, floater.neighborhood)
    const plot = layoutFor(n).slots[floater.slot]
    const screen = worldToScreen(cam, plot.x, plot.y - 12)
    const y = screen.y - (f.lifts.get(n.id) ?? 0) - floater.row * 17
    floatingLabel(ctx, screen.x, y, floater.text, floater.colour, progress)
  }
  return complete
}

// The ground, the river and the bridges are a few shapes, drawn directly; the
// countryside's sprites come from tiles cached per zoom bucket (countryside.ts).
// Returns false while countryside tiles are still being built.
function drawBackground(ctx: CanvasRenderingContext2D, f: FrameInput, season: SeasonLook): boolean {
  const { cam, scenario } = f
  ctx.fillStyle = seasonalGround(COLORS.ground, season)
  ctx.fillRect(0, 0, f.cssWidth, f.cssHeight)
  drawRiver(ctx, cam, scenario.river.points, scenario.river.halfDepth)
  for (const bridge of scenario.bridges) drawBridge(ctx, cam, bridge.point, scenario.river.halfDepth)
  return drawCountryside(ctx, scenario, cam, zoomBucket(cam.zoom), f.cssWidth, f.cssHeight, f.dpr, season)
}

// Fish leaping and ducks paddling (they rest in winter).
function drawRiverLife(ctx: CanvasRenderingContext2D, f: FrameInput, season: SeasonLook, t: number, s: number): void {
  if (season.life < 0.5) return
  const { cam, scenario } = f
  const river = scenario.river.points
  const half = scenario.river.halfDepth
  const life = wildsFor(scenario).life
  for (const fish of life.fish) {
    const { p, normal } = alongRiver(river, fish.along)
    const at = worldToScreen(cam, p.x + normal.x * fish.side * half * 0.5, p.y + normal.y * fish.side * half * 0.5)
    leapingFish(ctx, at.x, at.y, s, t, fish.seed)
  }
  life.ducks.forEach((d, i) => {
    const phase = t * 0.035 + d.seed
    const { p, normal } = alongRiver(river, d.along + Math.sin(phase) * d.range)
    const at = worldToScreen(cam, p.x + normal.x * d.side * half * 0.45, p.y + normal.y * d.side * half * 0.45)
    duck(ctx, at.x, at.y, s, Math.cos(phase) >= 0 ? 1 : -1, t + d.seed, i % 2 === 0)
  })
}

function drawLife(
  ctx: CanvasRenderingContext2D,
  f: FrameInput,
  n: NeighborhoodDef,
  look: DistrictLook,
  lift: number,
  t: number,
  s: number,
): void {
  const { cam } = f
  const layout = layoutFor(n)
  const at = (wx: number, wy: number) => {
    const p = worldToScreen(cam, wx, wy)
    return { x: p.x, y: p.y - lift }
  }

  // Chimney smoke thins as the district's energy gets cleaner.
  const smokeAmount = Math.min(1, Math.max(0, (0.85 - look.needs.energy) * 1.8))
  for (const b of layout.buildings) {
    if (b.style !== 'shed') continue
    const c = at(b.x + CHIMNEY_TOP.dx, b.y + CHIMNEY_TOP.dy)
    smoke(ctx, c.x, c.y, s, t + b.variant * 3, smokeAmount)
  }

  layout.slots.forEach((plot, i) => {
    const slot = look.slots[i]
    const p = at(plot.x, plot.y)
    // A project popping in: scaled with an overshoot, with sparkles.
    const pop = f.pops.find((q) => q.neighborhood === n.id && q.slot === i)
    if (pop && f.now - pop.born < POP_MS) {
      const progress = (f.now - pop.born) / POP_MS
      const k = popScale(progress)
      ctx.save()
      ctx.translate(p.x, p.y)
      ctx.scale(k, k)
      ctx.translate(-p.x, -p.y)
      drawDecoration(ctx, pop.visual, p.x, p.y, s, plot.variant)
      ctx.restore()
      sparkles(ctx, p.x, p.y, s, progress)
      return
    }
    if (slot && slot.building !== null) {
      drawBuildRing(ctx, p.x, p.y, s, slot.building)
      return
    }
    if (!slot || slot.expired) {
      if (slot?.visual === 'energyCoop') {
        const hub = turbineHub(p.x, p.y, s)
        turbineBlades(ctx, hub.x, hub.y, s, t, false)
      }
      return
    }
    if (slot.visual === 'energyCoop') {
      const hub = turbineHub(p.x, p.y, s)
      turbineBlades(ctx, hub.x, hub.y, s, t, true)
    } else if (slot.visual === 'meadow') {
      // Bees and butterflies stay home in winter (and thin out in autumn).
      if (look.season.life >= 0.5) bees(ctx, p.x, p.y, s, t + plot.variant * 5)
      if (look.season.life >= 1 && look.needs.green > 0.55) butterfly(ctx, p.x, p.y, s, t, Math.floor(plot.variant * 10))
    } else if (slot.visual === 'garden') {
      if (look.season.life >= 0.5) bees(ctx, p.x, p.y - 2 * s, s, t + i)
    } else if (slot.visual === 'rainGarden') {
      ripple(ctx, p.x, p.y, s, t + plot.variant)
    }
  })

  // Birds come back to green districts.
  const green = look.needs.green
  const birds = Math.round((green > 0.85 ? 3 : green > 0.72 ? 2 : green > 0.6 ? 1 : 0) * look.season.life)
  const centre = at(n.shape.x, n.shape.y - n.shape.radius * 0.45)
  for (let i = 0; i < birds; i++) bird(ctx, centre.x, centre.y, s, t, (n.shape.seed % 97) + i * 2.1)

  // Journal species living here: one at a time, taking turns every ~15 s.
  if (look.species.length > 0) {
    const turn = Math.floor(t / 15 + (n.shape.seed % 7)) % look.species.length
    const id = look.species[turn]
    const plots = layout.greenery.length > 0 ? layout.greenery : layout.slots
    const home = plots.length > 0 ? plots[n.shape.seed % plots.length] : { x: n.shape.x, y: n.shape.y }
    const p = at(home.x + 6, home.y + 2)
    drawSpecies(ctx, id, p.x, p.y, s, t + (n.shape.seed % 11))
  }
}
