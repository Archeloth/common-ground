import { describe, expect, it } from 'vitest'
import { speedForKey } from './speedKeys'

describe('speed shortcuts', () => {
  it('Space pauses a running game and resumes at the last speed', () => {
    expect(speedForKey(' ', 2, 2)).toBe(0)
    expect(speedForKey(' ', 0, 4)).toBe(4)
    expect(speedForKey(' ', 0, 0)).toBe(1) // nothing remembered yet: normal speed
  })

  it('1, 2 and 3 pick 1x, 2x and 4x', () => {
    expect(speedForKey('1', 0, 1)).toBe(1)
    expect(speedForKey('2', 1, 1)).toBe(2)
    expect(speedForKey('3', 1, 1)).toBe(4)
  })

  it('ignores every other key', () => {
    expect(speedForKey('a', 1, 1)).toBeNull()
    expect(speedForKey('Escape', 1, 1)).toBeNull()
    expect(speedForKey('4', 1, 1)).toBeNull()
  })
})
