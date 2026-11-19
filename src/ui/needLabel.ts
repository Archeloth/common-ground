import type { NeedId } from '../game/types'
import { loadScenario } from '../game/scenario'
import { t } from './i18n'

// A need's name in the town being played (Milestone 10): hot regions read
// housing comfort as cooling. Everything that names a need goes through here.
export function needLabel(need: NeedId): string {
  if (need === 'housing' && loadScenario().needLabels?.housing === 'cooling') return t('need.housing.cooling')
  return t(`need.${need}`)
}
