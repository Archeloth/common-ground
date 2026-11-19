import type { ScenarioDef } from '../game/types'
import { districtOutline } from '../game/outline'
import { scenarioBounds } from '../game/scenario'
import { COLORS, KIND_COLORS, shade } from './render/colors'

// A small map of a town for the main menu's picker (Milestone 10): the real
// district outlines in their kind colours, the river and its bridges. Drawn
// from the scenario data, so a new town gets its preview for free.

const PAD = 24

function path(points: readonly { x: number; y: number }[]): string {
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ') + ' Z'
}

export default function TownPreview({ town }: { town: ScenarioDef }) {
  const box = scenarioBounds(town)
  const viewBox = `${box.minX - PAD} ${box.minY - PAD} ${box.width + PAD * 2} ${box.height + PAD * 2}`
  const river = town.river.points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x} ${p.y}`).join(' ')
  return (
    <svg className="town-preview" viewBox={viewBox} preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <path d={river} fill="none" stroke={COLORS.riverBank} strokeWidth={town.river.halfDepth * 2 + 10} strokeLinecap="round" strokeLinejoin="round" />
      <path d={river} fill="none" stroke={COLORS.river} strokeWidth={town.river.halfDepth * 2} strokeLinecap="round" strokeLinejoin="round" />
      {town.bridges.map((b) => (
        <rect
          key={`${b.from}-${b.to}`}
          x={b.point.x - 9}
          y={b.point.y - town.river.halfDepth - 6}
          width={18}
          height={town.river.halfDepth * 2 + 12}
          rx={3}
          fill={COLORS.bridgeDeck}
        />
      ))}
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
