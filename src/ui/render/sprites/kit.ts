// Small drawing kit shared by every sprite (Milestone 9 art). Sprites are drawn
// in world units around a ground point and scaled by `s` (screen pixels per
// world unit, i.e. the camera zoom), so they stay crisp at any zoom.
//
// The look: soft rounded shapes, a gentle drop shadow, a thin darker outline
// and one highlight - cute and readable at small sizes.

export type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D

// Sprites are drawn a little larger than their layout footprint, so the
// little town reads well at the overview zoom.
export const SPRITE_SCALE = 1.15

export const PALETTE = {
  outline: 'rgba(45, 38, 30, 0.55)',
  shadow: 'rgba(31, 43, 28, 0.18)',
  wallCream: '#f6ecda',
  wallSand: '#ecd7b5',
  wallPeach: '#f2c9a8',
  wallSky: '#d9e6ee',
  wallMint: '#d6ead2',
  roofRed: '#d0644e',
  roofTerracotta: '#c97a4f',
  roofSlate: '#71809a',
  roofMoss: '#7c9a5c',
  roofPlum: '#9a6b86',
  roofCosy: '#c94f45', // retrofitted roofs: warm and new
  window: '#9cc3dd',
  windowWarm: '#ffd77e',
  door: '#8a5a3c',
  leaf: '#69a85c',
  leafLight: '#86c271',
  leafDark: '#4a8a4f',
  blossom: '#86c271', // cherry and other flowering trees; seasons set it
  trunk: '#8a5a3c',
  conifer: '#3f7d55',
  coniferTop: '#4f9466',
  reedStem: '#6f9a4f',
  reedHead: '#8a5a3c',
  lilypadShade: '#3f7d55',
  soil: '#9a6b47',
  soilDark: '#7c5236',
  path: '#d9d3c4',
  bikeLane: '#7bbf6a',
  water: '#8fc4e3',
  waterDeep: '#6aa9cf',
  panel: '#3b5f8f',
  panelShine: '#7fa6d6',
  white: '#ffffff',
  sun: '#ffd34d',
  awningRed: '#e0645a',
  awningCream: '#fff4e0',
  barnRed: '#c0503e',
  wheat: '#e6c86a',
  crop: '#9bc469',
  carColors: ['#e07a5f', '#f2cc8f', '#81b29a', '#6d8fc7', '#c48bb9'],
  flowerColors: ['#f28ab2', '#ffd34d', '#ffffff', '#b48ef2', '#ff9f68'],
  binColors: ['#4f8fd6', '#5fae5a', '#f2c94c'],
} as const

export const WALLS: string[] = []
export const ROOFS: string[] = []

// The wall and roof swatches buildings pick from. A RegionTheme (Milestone
// 10) changes PALETTE, then calls this to refill them in place.
export function rebuildSwatches(): void {
  WALLS.splice(0, WALLS.length, PALETTE.wallCream, PALETTE.wallSand, PALETTE.wallPeach, PALETTE.wallSky, PALETTE.wallMint)
  ROOFS.splice(0, ROOFS.length, PALETTE.roofRed, PALETTE.roofTerracotta, PALETTE.roofSlate, PALETTE.roofMoss, PALETTE.roofPlum)
}
rebuildSwatches()

export function pick<T>(list: readonly T[], variant: number): T {
  return list[Math.min(list.length - 1, Math.floor(variant * list.length))]
}

export function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number): void {
  const rr = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.arcTo(x + w, y, x + w, y + h, rr)
  ctx.arcTo(x + w, y + h, x, y + h, rr)
  ctx.arcTo(x, y + h, x, y, rr)
  ctx.arcTo(x, y, x + w, y, rr)
  ctx.closePath()
}

// Fill with the main colour and a thin darker outline.
export function fillOutlined(ctx: Ctx, fill: string, s: number, line = 0.6): void {
  ctx.fillStyle = fill
  ctx.fill()
  ctx.lineWidth = Math.max(0.6, line * s)
  ctx.strokeStyle = PALETTE.outline
  ctx.stroke()
}

// The soft oval shadow every sprite sits on.
export function groundShadow(ctx: Ctx, x: number, y: number, w: number, s: number): void {
  ctx.beginPath()
  ctx.ellipse(x, y + 0.6 * s, (w / 2) * s, (w / 6) * s, 0, 0, Math.PI * 2)
  ctx.fillStyle = PALETTE.shadow
  ctx.fill()
}

export function circle(ctx: Ctx, x: number, y: number, r: number): void {
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
}

// Mix two #rrggbb colours (t = 0 gives a, 1 gives b).
export function mix(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16)
  const pb = parseInt(b.slice(1), 16)
  const ch = (shift: number) => {
    const va = (pa >> shift) & 0xff
    const vb = (pb >> shift) & 0xff
    return Math.round(va + (vb - va) * t)
      .toString(16)
      .padStart(2, '0')
  }
  return `#${ch(16)}${ch(8)}${ch(0)}`
}
