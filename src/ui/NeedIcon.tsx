import type { NeedId } from '../game/types'
import { NEED_COLORS } from './render/colors'

// One small icon per need (Milestone 9), always shown with the need's name or
// a tooltip. Simple filled shapes on a 16x16 grid, tinted with the need colour.
const PATHS: Record<NeedId, string> = {
  // bolt
  energy: 'M9.2 1.5 3.6 9.1h3.7l-1 5.4 5.6-7.7H8.2z',
  // carrot
  food: 'M4.2 13.3c-.6-.6-.5-1.6.1-2.3l4.6-4.9 1.9 1.9-4.9 4.6c-.7.6-1.7.7-2.3.1zM9.6 5.4l1 1 2.6-2.1-.6-.6zm.3-2.6 1.3 1.3.8-2.4zm1.6 3.4 2.4-.8-1.3-1.3z',
  // bike (two wheels and a frame)
  mobility:
    'M4 13.2a2.7 2.7 0 1 1 0-5.4 2.7 2.7 0 0 1 0 5.4zm0-1.3a1.4 1.4 0 1 0 0-2.8 1.4 1.4 0 0 0 0 2.8zm8 1.3a2.7 2.7 0 1 1 0-5.4 2.7 2.7 0 0 1 0 5.4zm0-1.3a1.4 1.4 0 1 0 0-2.8 1.4 1.4 0 0 0 0 2.8zM7.3 4h2.4v1.2H8.6l1.1 2.2 1.5-.6.5 1.2-2.3.9-1.2-2.4-2 3.2-1-.7 2.3-3.7z',
  // leaf
  green: 'M13.6 2.4C7.4 2.1 3 5.3 3 10.2c0 1 .2 1.9.6 2.6L2.4 14l.9.9 1.2-1.2c.7.4 1.6.6 2.6.6 4.9 0 8.1-4.4 6.5-11.9zM5.4 11.5c1.6-2.6 3.4-4.3 5.9-5.6-2 1.6-3.5 3.4-5 6.1z',
  // recycling loop
  waste:
    'M8 2.3 10.4 5H9v1.6A3.6 3.6 0 0 1 11.6 10H13a5 5 0 0 0-4-4.9V5H7.6zM4.4 6.8l-1.9 3.1 3.6.2-.7-1.2.8-.5A3.6 3.6 0 0 1 9.9 8l.7-1.2a5 5 0 0 0-5.4.4l-.1.1zM12 11.4H5.3L6 10H4.4l-1.6 2.6 1.7 2h1.2l-.7-1.2H12z',
  // house
  housing: 'M8 1.8 1.6 7.4l.9 1 .9-.8V14h3.5v-3.6h2.2V14h3.5V7.6l.9.8.9-1z',
  // water drop
  water: 'M8 1.5C6.2 4.4 3.6 7.3 3.6 9.9a4.4 4.4 0 0 0 8.8 0C12.4 7.3 9.8 4.4 8 1.5zm-2.3 8.6c.2 1.3 1 2.1 2.2 2.4l-.3 1.1c-1.7-.4-2.8-1.6-3-3.3z',
}

export default function NeedIcon({ need, size = 14 }: { need: NeedId; size?: number }) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} aria-hidden="true" className="need-icon">
      <path d={PATHS[need]} fill={NEED_COLORS[need]} />
    </svg>
  )
}
