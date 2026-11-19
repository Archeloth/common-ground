import { describe, expect, it } from 'vitest'
import { TRANSPORT_MODES } from '../game/transport'
import { t } from './i18n'
import { TRANSPORT_TEXT_KEYS } from './transportText'
import { VEHICLES } from './render/sprites/life'
import { COLORS } from './render/colors'

// Milestone 10: every transport mode has all its texts, a vehicle and a
// route colour, so a town can switch mode with one line of content.
describe('transport modes in the interface', () => {
  it.each([...TRANSPORT_MODES])('%s has every text, a vehicle and a route colour', (mode) => {
    for (const key of TRANSPORT_TEXT_KEYS) expect(t(`transport.${mode}.${key}`), key).not.toBe(`transport.${mode}.${key}`)
    expect(typeof VEHICLES[mode]).toBe('function')
    expect(COLORS[mode]).toMatch(/^#[0-9a-f]{6}$/i)
  })
})
