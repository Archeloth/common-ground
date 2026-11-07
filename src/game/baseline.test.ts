// Placeholder guard so `yarn test` is green from the baseline on.
// Milestone 1 replaces this with real simulation specs: the seeded rng
// ("same seed => same numbers"), tick() determinism and command handling.
import { describe, expect, it } from 'vitest'

describe('baseline', () => {
  it('runs the test runner', () => {
    expect(1 + 1).toBe(2)
  })
})
