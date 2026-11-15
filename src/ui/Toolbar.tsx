import { useCallback } from 'react'
import type { ReactNode } from 'react'
import { useEscapeToClose } from './useEscapeToClose'
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
// Only one drawer is open at a time. It stays open while the player pans and
// clicks around the map, and closes with its button, its x, or Escape.
export default function Toolbar({ open, onOpen, onLexicon, onMenu, drawers }: ToolbarProps) {
  const close = useCallback(() => onOpen(null), [onOpen])
  useEscapeToClose(open !== null, close)

  return (
    <div className="toolbar">
      <div className="toolbar-buttons" role="toolbar" aria-label={t('toolbar.label')}>
        {DRAWERS.map((id) => (
          <button
            key={id}
            type="button"
            className={`toolbar-button${open === id ? ' active' : ''}`}
            aria-expanded={open === id}
            data-sound={open === id ? 'close' : 'open'}
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
      {open && (
        <div className={`toolbar-drawer drawer-${open}`} role="region" aria-label={t(`toolbar.${open}`)}>
          <button type="button" className="drawer-close" data-sound="close" onClick={close} aria-label={t('toolbar.close')}>
            ×
          </button>
          <div className="drawer-body">{drawers[open]}</div>
        </div>
      )}
    </div>
  )
}
