import { useCallback, useRef } from 'react'
import type { ReactNode } from 'react'
import { useDismissable } from './useDismissable'
import { t } from './i18n'
import './Toolbar.css'

export type DrawerId = 'town' | 'research' | 'saves'

const DRAWERS: readonly DrawerId[] = ['town', 'research', 'saves']

interface ToolbarProps {
  open: DrawerId | null
  onOpen: (drawer: DrawerId | null) => void
  onLexicon: () => void
  onMenu: () => void
  drawers: Record<DrawerId, ReactNode>
}

// One toolbar for the map's menus (Milestone 8.5: "easier to overview UI").
// Only one drawer is open at a time, and a click anywhere outside it - or
// Escape - closes it.
export default function Toolbar({ open, onOpen, onLexicon, onMenu, drawers }: ToolbarProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const close = useCallback(() => onOpen(null), [onOpen])
  useDismissable(rootRef, open !== null, close)

  return (
    <div className="toolbar" ref={rootRef}>
      <div className="toolbar-buttons" role="toolbar" aria-label={t('toolbar.label')}>
        {DRAWERS.map((id) => (
          <button
            key={id}
            type="button"
            className={`toolbar-button${open === id ? ' active' : ''}`}
            aria-expanded={open === id}
            onClick={() => onOpen(open === id ? null : id)}
          >
            {t(`toolbar.${id}`)}
          </button>
        ))}
        <button
          type="button"
          className="toolbar-button"
          onClick={() => {
            onOpen(null)
            onLexicon()
          }}
        >
          {t('toolbar.lexicon')}
        </button>
        <button type="button" className="toolbar-button toolbar-menu" onClick={onMenu}>
          {t('toolbar.menu')}
        </button>
      </div>
      {open && <div className={`toolbar-drawer drawer-${open}`}>{drawers[open]}</div>}
    </div>
  )
}
