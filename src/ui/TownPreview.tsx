import type { ScenarioDef, WaterFeature } from '../game/types'
import { districtOutline } from '../game/outline'
import { scenarioBounds } from '../game/scenario'
import { crossingFrame } from '../game/water'
import { COLORS, KIND_COLORS, shade } from './render/colors'

// A small map of a town for the main menu's picker (Milestone 10): the real
// district outlines in their kind colours, the water and its crossings. Drawn
// from the scenario data, so a new town gets its preview for free.

const PAD = 24

function path(points: readonly { x: number; y: number }[], closed = true): string {
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ') + (closed ? ' Z' : '')
}

function Water({ w }: { w: WaterFeature }) {
  if (w.kind === 'oasis') {
    return <path d={path(w.points)} fill={COLORS.river} stroke={COLORS.riverBank} strokeWidth={10} strokeLinejoin="round" />
  }
  const d = path(w.points, false)
  const [bank, bed] = w.kind === 'wadi' ? [COLORS.wadiBank, COLORS.wadiBed] : [COLORS.riverBank, COLORS.river]
  const line = { fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' } as const
  return (
    <>
      <path d={d} {...line} stroke={bank} strokeWidth={w.halfDepth * 2 + 10} />
      <path d={d} {...line} stroke={bed} strokeWidth={w.halfDepth * 2} />
    </>
  )
}

export default function TownPreview({ town }: { town: ScenarioDef }) {
  const box = scenarioBounds(town)
  const viewBox = `${box.minX - PAD} ${box.minY - PAD} ${box.width + PAD * 2} ${box.height + PAD * 2}`
  return (
    <svg className="town-preview" viewBox={viewBox} preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      {town.water.map((w) => (
        <Water key={w.id} w={w} />
      ))}
      {town.crossings.map((c) => {
        const { normal, halfDepth } = crossingFrame(town, c)
        const angle = (Math.atan2(normal.y, normal.x) * 180) / Math.PI - 90
        const colour = c.kind === 'ford' ? COLORS.fordStone : COLORS.bridgeDeck
        return (
          <rect
            key={`${c.from}-${c.to}-${c.water}`}
            x={-9}
            y={-halfDepth - 6}
            width={18}
            height={halfDepth * 2 + 12}
            rx={3}
            fill={colour}
            transform={`translate(${c.point.x} ${c.point.y}) rotate(${angle.toFixed(1)})`}
          />
        )
      })}
      {town.neighborhoods.map((n) => {
        const d = path(districtOutline(town, n.id))
        return (
          <g key={n.id}>
            <path d={d} transform="translate(0 6)" fill={shade(KIND_COLORS[n.kind], -25)} />
            <path d={d} fill={KIND_COLORS[n.kind]} />
          </g>
        )
      })}
    </svg>
  )
}
