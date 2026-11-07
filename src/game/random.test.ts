import { describe, expect, it } from 'vitest'
import { mulberry32 } from './random'

describe('mulberry32', () => {
  it('returns the same sequence for the same seed (Milestone 1 exit test)', () => {
    const seq = (seed: number, n: number) =>
      Array.from({ length: n }, () => mulberry32(seed)())
    expect(seq(48213, 20)).toEqual(seq(48213, 20))
  })

  it('returns different sequences for different seeds', () => {
    const first = (seed: number) => mulberry32(seed)()
    expect(first(1)).not.toBe(first(2))
    expect(first(1)).not.toBe(first(999))
    expect(first(2)).not.toBe(first(999))
  })

  it('always returns values in [0, 1)', () => {
    const rand = mulberry32(1337)
    for (let i = 0; i < 10_000; i++) {
      const v = rand()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })

  it('does not depend on when the generator was created', () => {
    const now = mulberry32(42)
    const later = mulberry32(42)
    const a = Array.from({ length: 5 }, () => now())
    const b = Array.from({ length: 5 }, () => later())
    expect(a).toEqual(b)
  })
})
