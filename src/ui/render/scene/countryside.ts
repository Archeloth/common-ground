import type { ScenarioDef } from '../../../game/types'
import type { Camera } from '../camera'
import { SPRITE_SCALE } from '../sprites/kit'
import { drawWild } from '../sprites/wilds'
import type { WildItem } from './wilds'
import { wildsFor } from './wilds'
import type { SeasonLook } from './season'

// The countryside's thousands of trees, bushes and flowers, cached in tiles
// (playtest: zooming in and out a lot made the frame rate stutter, because
// every camera change repainted every sprite in view). Tiles are anchored to
// the world and drawn at the same zoom "bucket" as the district caches, so
// panning and zooming inside a bucket only copies bitmaps. Crossing into a new
// bucket builds the new tiles a few at a time; until a tile is ready, the
// previous bucket's tiles stand in for it, slightly soft for a frame or two.

const TILE = 512 // device pixels per tile side
const BUILD_BUDGET_MS = 6 // per frame, once something is already on screen
const MAX_TILES = 96

// How far a sprite reaches from its ground point, in sprite units (scaled by
// SPRITE_SCALE): the tallest tree is ~30 units, the widest crown ~20.
const REACH_SIDE = 22
const REACH_UP = 32
const REACH_DOWN = 10

interface Tile {
  canvas: HTMLCanvasElement | null // null: nothing grows here
  used: number
}

interface Bucket {
  zoom: number
  dpr: number
  world: number // world units per tile side
}

const tiles = new Map<string, Tile>()
let tileSeason = ''
let stable: Bucket | null = null // the last bucket that filled the whole view
let clock = 0

function bucketOf(zoom: number, dpr: number): Bucket {
  return { zoom, dpr, world: TILE / (zoom * dpr) }
}

function tileKey(b: Bucket, i: number, j: number): string {
  return `${b.zoom.toFixed(4)}@${b.dpr}|${i},${j}`
}

function buildTile(items: readonly WildItem[], b: Bucket, i: number, j: number, life: number): Tile {
  const x0 = i * b.world
  const y0 = j * b.world
  const reach = SPRITE_SCALE
  const inside = items.filter(
    (it) =>
      it.x + REACH_SIDE * reach >= x0 &&
      it.x - REACH_SIDE * reach <= x0 + b.world &&
      it.y + REACH_DOWN * reach >= y0 &&
      it.y - REACH_UP * reach <= y0 + b.world,
  )
  if (inside.length === 0) return { canvas: null, used: clock }
  const canvas = document.createElement('canvas')
  canvas.width = TILE
  canvas.height = TILE
  const g = canvas.getContext('2d')!
  g.setTransform(b.dpr, 0, 0, b.dpr, 0, 0)
  const s = b.zoom * SPRITE_SCALE
  // `inside` keeps the layout's back-to-front order.
  for (const it of inside) drawWild(g, it, (it.x - x0) * b.zoom, (it.y - y0) * b.zoom, s, life)
  return { canvas, used: clock }
}

function visibleRange(cam: Camera, b: Bucket, cssWidth: number, cssHeight: number, pad: number) {
  return {
    i0: Math.floor(cam.x / b.world) - pad,
    i1: Math.floor((cam.x + cssWidth / cam.zoom) / b.world) + pad,
    j0: Math.floor(cam.y / b.world) - pad,
    j1: Math.floor((cam.y + cssHeight / cam.zoom) / b.world) + pad,
  }
}

function blit(ctx: CanvasRenderingContext2D, cam: Camera, b: Bucket, i: number, j: number, canvas: HTMLCanvasElement) {
  // Rounded edges taken from the neighbours' edges, so tiles meet without seams.
  const x0 = Math.round((i * b.world - cam.x) * cam.zoom)
  const x1 = Math.round(((i + 1) * b.world - cam.x) * cam.zoom)
  const y0 = Math.round((j * b.world - cam.y) * cam.zoom)
  const y1 = Math.round(((j + 1) * b.world - cam.y) * cam.zoom)
  ctx.drawImage(canvas, x0, y0, x1 - x0, y1 - y0)
}

// Least recently used first; never a tile this frame drew or built.
function evict(): void {
  if (tiles.size <= MAX_TILES) return
  const old = [...tiles.entries()].filter(([, t]) => t.used < clock).sort((a, b) => a[1].used - b[1].used)
  for (const [key] of old.slice(0, tiles.size - MAX_TILES)) tiles.delete(key)
}

// Draws the countryside for this camera. Returns false while tiles are still
// being built, so the caller keeps drawing frames until the view is complete.
export function drawCountryside(
  ctx: CanvasRenderingContext2D,
  scenario: ScenarioDef,
  cam: Camera,
  bucketZoom: number,
  cssWidth: number,
  cssHeight: number,
  dpr: number,
  season: SeasonLook,
): boolean {
  const items = wildsFor(scenario).items
  if (tileSeason !== season.season) {
    // A new season repaints everything; there is nothing older worth showing.
    tiles.clear()
    stable = null
    tileSeason = season.season
  }
  clock++
  const b = bucketOf(bucketZoom, dpr)
  const sameAsStable = stable !== null && stable.zoom === b.zoom && stable.dpr === b.dpr
  const fallback = sameAsStable ? null : stable
  const start = performance.now()
  // With nothing to stand in, build the whole view now (the first frame, or a
  // new season), as the old full repaint did.
  const overBudget = () => fallback !== null && performance.now() - start > BUILD_BUDGET_MS

  const view = visibleRange(cam, b, cssWidth, cssHeight, 0)
  const missing: Array<[number, number]> = []
  const ready: Array<[number, number, HTMLCanvasElement]> = []
  for (let j = view.j0; j <= view.j1; j++) {
    for (let i = view.i0; i <= view.i1; i++) {
      const key = tileKey(b, i, j)
      let tile = tiles.get(key)
      if (!tile && !overBudget()) {
        tile = buildTile(items, b, i, j, season.life)
        tiles.set(key, tile)
      }
      if (!tile) {
        missing.push([i, j])
        continue
      }
      tile.used = clock
      if (tile.canvas) ready.push([i, j, tile.canvas])
    }
  }

  // Stand-ins: the previous bucket's tiles, clipped to the holes.
  if (missing.length > 0 && fallback) {
    ctx.save()
    ctx.beginPath()
    for (const [i, j] of missing) {
      const x = (i * b.world - cam.x) * cam.zoom
      const y = (j * b.world - cam.y) * cam.zoom
      ctx.rect(x, y, b.world * cam.zoom, b.world * cam.zoom)
    }
    ctx.clip()
    const old = visibleRange(cam, fallback, cssWidth, cssHeight, 0)
    for (let j = old.j0; j <= old.j1; j++) {
      for (let i = old.i0; i <= old.i1; i++) {
        const tile = tiles.get(tileKey(fallback, i, j))
        if (!tile) continue
        tile.used = clock
        if (tile.canvas) blit(ctx, cam, fallback, i, j, tile.canvas)
      }
    }
    ctx.restore()
  }
  for (const [i, j, canvas] of ready) blit(ctx, cam, b, i, j, canvas)

  if (missing.length === 0) {
    stable = b
    // Spare time goes on the ring just outside the view, so panning and
    // zooming out reveal trees that are already painted.
    const ring = visibleRange(cam, b, cssWidth, cssHeight, 1)
    for (let j = ring.j0; j <= ring.j1 && performance.now() - start < BUILD_BUDGET_MS; j++) {
      for (let i = ring.i0; i <= ring.i1 && performance.now() - start < BUILD_BUDGET_MS; i++) {
        const key = tileKey(b, i, j)
        if (!tiles.has(key) && tiles.size < MAX_TILES) tiles.set(key, buildTile(items, b, i, j, season.life))
      }
    }
  }
  evict()
  return missing.length === 0
}
