// Seeded pseudo-random generator (mulberry32).
//
// Game logic must never call Math.random(): the same seed has to produce the
// same sequence so town layouts, saves and tests are reproducible. Keep the
// generator state inside the saved game state. (Development plan, pattern 3.)

export type Rng = () => number

export function mulberry32(seed: number): Rng {
  let s = seed | 0
  return () => {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
