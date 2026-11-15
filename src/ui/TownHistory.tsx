import { useMemo, useRef, useState } from 'react'
import type { HistoryPoint, NeedId } from '../game/types'
import { NEED_ORDER } from '../game/needs'
import { NEED_COLORS } from './render/colors'
import NeedIcon from './NeedIcon'
import { formatGameDate } from './dates'
import { t } from './i18n'
import './TownHistory.css'

type View = 'satisfaction' | 'budget' | 'needs'

const W = 340
const H = 120
const PAD = { left: 30, right: 8, top: 8, bottom: 18 }
const SAT_COLOUR = '#3f6a3a'
const BUDGET_COLOUR = '#2a78d6'

function formatMoney(value: number): string {
  return value >= 1000 ? `${Math.round(value / 100) / 10}k` : String(Math.round(value))
}

// A "nice" upper bound for the money axis (1, 2 or 5 x 10^n).
function niceMax(value: number): number {
  if (value <= 0) return 1000
  const exp = 10 ** Math.floor(Math.log10(value))
  for (const step of [1, 2, 5, 10]) if (value <= step * exp) return step * exp
  return 10 * exp
}

interface Series {
  values: number[]
  max: number
  ticks: number[]
  format: (v: number) => string
  colour: string
}

// One line chart with a hover crosshair (single series; the title names it).
function LineChart({
  points,
  series,
  label,
  compact = false,
}: {
  points: HistoryPoint[]
  series: Series
  label: string
  compact?: boolean
}) {
  const [hover, setHover] = useState<number | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const width = compact ? 150 : W
  const height = compact ? 52 : H
  const pad = compact ? { left: 4, right: 4, top: 4, bottom: 4 } : PAD
  const n = points.length
  const x = (i: number) => pad.left + (n <= 1 ? 0 : (i / (n - 1)) * (width - pad.left - pad.right))
  const y = (v: number) => pad.top + (1 - v / series.max) * (height - pad.top - pad.bottom)
  const path = series.values.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
  const area = `${path} L${x(n - 1).toFixed(1)},${y(0).toFixed(1)} L${x(0).toFixed(1)},${y(0).toFixed(1)} Z`
  // Year marks along the bottom (every 12 points from the first).
  const yearMarks = compact ? [] : points.map((p, i) => ({ p, i })).filter(({ i }) => i % 12 === 0)

  const onMove = (event: React.PointerEvent<SVGSVGElement>) => {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect || n === 0) return
    const px = ((event.clientX - rect.left) / rect.width) * width
    const ratio = (px - pad.left) / (width - pad.left - pad.right)
    setHover(Math.max(0, Math.min(n - 1, Math.round(ratio * (n - 1)))))
  }

  return (
    <div className={`history-chart${compact ? ' compact' : ''}`}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={label}
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
      >
        {!compact &&
          series.ticks.map((tick) => (
            <g key={tick}>
              <line className="history-grid" x1={pad.left} x2={width - pad.right} y1={y(tick)} y2={y(tick)} />
              <text className="history-axis" x={pad.left - 4} y={y(tick)} textAnchor="end" dominantBaseline="middle">
                {series.format(tick)}
              </text>
            </g>
          ))}
        {yearMarks.map(({ p, i }) => (
          <text key={p.day} className="history-axis" x={x(i)} y={height - 4} textAnchor="middle">
            {t('history.year', { year: Math.floor((p.day - 1) / 360) + 1 })}
          </text>
        ))}
        <path d={area} fill={series.colour} opacity={0.1} />
        <path d={path} fill="none" stroke={series.colour} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {hover !== null && (
          <g>
            <line className="history-crosshair" x1={x(hover)} x2={x(hover)} y1={pad.top} y2={height - pad.bottom} />
            <circle cx={x(hover)} cy={y(series.values[hover])} r={4} fill={series.colour} stroke="#fbfcf7" strokeWidth={2} />
          </g>
        )}
      </svg>
      {hover !== null && (
        <div
          className="history-tooltip"
          style={{
            left: `${Math.min(85, Math.max(15, (x(hover) / width) * 100))}%`,
            // Keep clear of the marker: below it when the point is high, above when low.
            top: y(series.values[hover]) < height / 2 ? `${((height - pad.bottom) / height) * 100}%` : 0,
            transform: y(series.values[hover]) < height / 2 ? 'translate(-50%, -100%)' : 'translateX(-50%)',
          }}
          role="status"
        >
          <span>{formatGameDate(points[hover].day)}</span>
          <strong>{series.format(series.values[hover])}</strong>
        </div>
      )}
    </div>
  )
}

// The Town overview's history (Milestone 9 polish): how the town changed,
// month by month. Satisfaction and money are separate charts (never two
// scales on one); the six needs are small charts on one shared 0-100% scale,
// so they compare at a glance without telling lines apart by colour alone.
export default function TownHistory({ history }: { history: HistoryPoint[] }) {
  const [view, setView] = useState<View>('satisfaction')
  const [table, setTable] = useState(false)

  const budgetMax = useMemo(() => niceMax(Math.max(0, ...history.map((p) => p.budget))), [history])

  if (history.length < 3) {
    return <p className="history-empty">{t('history.empty')}</p>
  }

  const first = history[0]
  const last = history[history.length - 1]
  const summary = t('history.summary', {
    from: Math.round(first.satisfaction),
    to: Math.round(last.satisfaction),
    since: formatGameDate(first.day),
  })

  return (
    <div className="town-history">
      <div className="history-tabs" role="tablist" aria-label={t('history.title')}>
        {(['satisfaction', 'budget', 'needs'] as const).map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={view === id}
            className={`history-tab${view === id ? ' active' : ''}`}
            onClick={() => setView(id)}
          >
            {t(`history.view.${id}`)}
          </button>
        ))}
      </div>

      {view === 'satisfaction' && (
        <LineChart
          points={history}
          label={t('history.view.satisfaction')}
          series={{
            values: history.map((p) => p.satisfaction),
            max: 100,
            ticks: [0, 50, 100],
            format: (v) => String(Math.round(v)),
            colour: SAT_COLOUR,
          }}
        />
      )}
      {view === 'budget' && (
        <LineChart
          points={history}
          label={t('history.view.budget')}
          series={{
            values: history.map((p) => p.budget),
            max: budgetMax,
            ticks: [0, budgetMax / 2, budgetMax],
            format: formatMoney,
            colour: BUDGET_COLOUR,
          }}
        />
      )}
      {view === 'needs' && (
        <div className="history-needs">
          {NEED_ORDER.map((need: NeedId) => (
            <div key={need} className="history-need">
              <span className="history-need-label">
                <NeedIcon need={need} size={12} />
                {t(`need.${need}`)}
                <strong>{Math.round(last.needs[need] * 100)}%</strong>
              </span>
              <LineChart
                compact
                points={history}
                label={t(`need.${need}`)}
                series={{
                  values: history.map((p) => p.needs[need] * 100),
                  max: 100,
                  ticks: [],
                  format: (v) => `${Math.round(v)}%`,
                  colour: NEED_COLORS[need],
                }}
              />
            </div>
          ))}
        </div>
      )}

      <p className="history-summary">{summary}</p>
      <button type="button" className="history-table-toggle" onClick={() => setTable((v) => !v)} aria-expanded={table}>
        {table ? t('history.hideTable') : t('history.showTable')}
      </button>
      {table && (
        <div className="history-table-wrap">
          <table className="history-table">
            <thead>
              <tr>
                <th scope="col">{t('history.date')}</th>
                <th scope="col">{t('history.view.satisfaction')}</th>
                <th scope="col">{t('resources.budget')}</th>
                {NEED_ORDER.map((need) => (
                  <th key={need} scope="col">
                    {t(`need.${need}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {history
                .filter((_, i) => i % 6 === 0 || i === history.length - 1)
                .map((p) => (
                  <tr key={p.day}>
                    <th scope="row">{formatGameDate(p.day)}</th>
                    <td>{Math.round(p.satisfaction)}</td>
                    <td>{p.budget.toLocaleString('en-GB')}</td>
                    {NEED_ORDER.map((need) => (
                      <td key={need}>{Math.round(p.needs[need] * 100)}%</td>
                    ))}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
