import type { GameState, NeighborhoodDef } from '../game/types'
import { kindById, loadKinds } from '../game/kinds'
import { NEED_ORDER } from '../game/needs'
import { satisfactionOf } from '../game/satisfaction'
import { expiredSlots } from '../game/expiry'
import { satisfactionTier } from './satisfactionTier'
import { t } from './i18n'
import NeedIcon from './NeedIcon'
import { NEED_COLORS } from './render/colors'

const kinds = loadKinds()

// The hover card on the map (Milestone 8.5 playtest feedback: "some
// satisfaction stats on hover over a district"): satisfaction with its tier
// word, engagement, the weakest need, six mini bars and a lapsed-project note.
export default function HoverChip({ neighborhood, state }: { neighborhood: NeighborhoodDef; state: GameState }) {
  const sim = state.neighborhoods[neighborhood.id]
  const needs = sim?.needs ?? neighborhood.needs
  const satisfaction = sim?.satisfaction ?? satisfactionOf(neighborhood.needs)
  const tier = satisfactionTier(satisfaction)
  const engagement = state.engagement[neighborhood.id] ?? neighborhood.engagement
  const weakest = NEED_ORDER.reduce((a, b) => (needs[a] <= needs[b] ? a : b))
  const lapsed = expiredSlots(state, neighborhood.id).length

  return (
    <div className="neighborhood-chip" role="status">
      <strong>{neighborhood.name}</strong>
      <span>
        {t('chip.subtitle', {
          kind: kindById(kinds, neighborhood.kind).name,
          residents: neighborhood.residents.toLocaleString('en-GB'),
        })}
      </span>
      <span className="chip-stats">
        <span className={`tier-dot tier-${tier}`} aria-hidden="true" />
        {t('chip.satisfaction', { value: Math.round(satisfaction), tier: t(`tier.${tier}`) })}
        <span className="chip-sep">·</span>
        {t('chip.engagement', { value: Math.round(engagement) })}
      </span>
      <span className="chip-weakest">
        <NeedIcon need={weakest} size={12} />{' '}
        {t('chip.weakest', { need: t(`need.${weakest}`), pct: Math.round(needs[weakest] * 100) })}
      </span>
      <span className="chip-bars" aria-hidden="true">
        {NEED_ORDER.map((need) => (
          <span key={need} className="chip-bar" title={t(`need.${need}`)}>
            <span
              className="chip-bar-fill"
              style={{ height: `${Math.round(needs[need] * 100)}%`, background: NEED_COLORS[need] }}
            />
          </span>
        ))}
      </span>
      {lapsed > 0 && <span className="chip-lapsed">⌛ {t('chip.lapsed', { count: lapsed })}</span>}
    </div>
  )
}
