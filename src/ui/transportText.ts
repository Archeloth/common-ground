import { loadScenario } from '../game/scenario'
import { transportOf } from '../game/transport'
import { t } from './i18n'

// Text for the town's way of linking districts (Milestone 10): "Bus links",
// "Minibus routes", "Boat routes" and so on.
export type TransportTextKey = 'icon' | 'lines' | 'start' | 'none' | 'undo' | 'count' | 'task' | 'guide'

export const TRANSPORT_TEXT_KEYS: readonly TransportTextKey[] = ['icon', 'lines', 'start', 'none', 'undo', 'count', 'task', 'guide']

export function transportText(key: TransportTextKey, params?: Record<string, string | number>): string {
  return t(`transport.${transportOf(loadScenario()).mode}.${key}`, params)
}
