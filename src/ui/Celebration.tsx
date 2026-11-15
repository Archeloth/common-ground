import { useMemo } from 'react'
import type { MilestoneDef } from '../game/milestones'
import { t } from './i18n'
import './Celebration.css'

const CONFETTI_COLOURS = ['#f28ab2', '#ffd34d', '#81b29a', '#6d8fc7', '#e07a5f', '#b48ef2']

// A chapter completed (Milestone 9): a warm card with confetti instead of a
// plain banner. Confetti is decoration only; reduced motion hides it (CSS).
export default function Celebration({ milestones, onDone }: { milestones: MilestoneDef[]; onDone: () => void }) {
  // Deterministic confetti layout (no Math.random in render).
  const pieces = useMemo(
    () =>
      Array.from({ length: 28 }, (_, i) => ({
        left: (i * 37) % 100,
        delay: ((i * 53) % 100) / 100,
        duration: 2.2 + ((i * 29) % 10) / 10,
        colour: CONFETTI_COLOURS[i % CONFETTI_COLOURS.length],
        tilt: (i * 47) % 360,
      })),
    [],
  )
  const reward = milestones.reduce((sum, m) => sum + m.reward.knowledge, 0)
  return (
    <div className="celebration" role="dialog" aria-modal="false" aria-labelledby="celebration-title">
      <div className="confetti" aria-hidden="true">
        {pieces.map((p, i) => (
          <span
            key={i}
            style={{
              left: `${p.left}%`,
              background: p.colour,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
              transform: `rotate(${p.tilt}deg)`,
            }}
          />
        ))}
      </div>
      <div className="celebration-card">
        <div className="celebration-badge" aria-hidden="true">
          🏅
        </div>
        <h2 id="celebration-title">{t('milestones.completedTitle')}</h2>
        {milestones.map((m) => (
          <p key={m.id} className="celebration-name">
            <strong>{t('goals.chapter', { chapter: m.chapter, name: m.name })}</strong>
            <span>{m.explain}</span>
          </p>
        ))}
        {reward > 0 && <p className="celebration-reward">📚 {t('milestones.reward', { value: reward })}</p>}
        <button type="button" className="celebration-button" onClick={onDone}>
          {t('milestones.gotIt')}
        </button>
      </div>
    </div>
  )
}
