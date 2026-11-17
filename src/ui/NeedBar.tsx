import type { NeedId } from '../game/types'
import NeedIcon from './NeedIcon'
import { NEED_COLORS } from './render/colors'

// One need bar (icon, label, track, percentage), shared by the neighbourhood
// panel and the Town overview. The fill eases to its new width, so a project's
// effect visibly grows (Milestone 9). Styles live in NeighborhoodPanel.css.
export default function NeedBar({ need, label, value }: { need: NeedId; label: string; value: number }) {
  const percent = Math.round(value * 100)
  return (
    <div className="need-bar">
      <span className="need-label">
        <NeedIcon need={need} />
        {label}
      </span>
      <div className="need-track">
        {/* backgroundColor, not background: the optional pattern is a CSS background-image. */}
        <div className="need-fill" data-need={need} style={{ width: `${percent}%`, backgroundColor: NEED_COLORS[need] }} />
      </div>
      <span className="need-value">{percent}%</span>
    </div>
  )
}
