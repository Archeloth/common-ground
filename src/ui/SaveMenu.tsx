import { useRef } from 'react'
import { SLOT_KEYS } from '../persistence/slots'
import type { SlotMeta } from '../persistence/slots'
import { t } from './i18n'
import { formatGameDate } from './dates'
import './SaveMenu.css'

interface SaveMenuProps {
  meta: Record<string, SlotMeta | null>
  onSave: (key: string) => void
  onLoad: (key: string) => void
  onExport: () => void
  onImport: (file: File) => void
  onNewGame: () => void
}

function formatSavedAt(savedAt: string): string {
  const date = new Date(savedAt)
  if (Number.isNaN(date.getTime())) return '?'
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function metaLine(meta: SlotMeta): string {
  return t('saves.lastSavedMeta', { date: formatGameDate(meta.day), time: formatSavedAt(meta.savedAt) })
}

// Save/load drawer body (Milestone 5; opened from the toolbar since 8.5): the autosave row, three manual slots, .json
// export/import (the no-server safety net) and a new-game reset.
export default function SaveMenu({ meta, onSave, onLoad, onExport, onImport, onNewGame }: SaveMenuProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const manualSlots = SLOT_KEYS.filter((key) => key !== 'auto')
  const autoMeta = meta.auto

  return (
    <div className="save-panel">
      <div className="save-slot save-autosave">
        <span className="save-slot-label">
          {t('saves.autosave')}
          {autoMeta ? ` — ${metaLine(autoMeta)}` : ''}
        </span>
      </div>

      {manualSlots.map((key, index) => {
        const slotMeta = meta[key]
        return (
          <div key={key} className="save-slot">
            <span className="save-slot-label">
              {t('saves.slot', { n: index + 1 })}
              {slotMeta ? ` — ${metaLine(slotMeta)}` : ` (${t('saves.empty')})`}
            </span>
            <div className="save-slot-actions">
              <button type="button" className="save-action" onClick={() => onSave(key)}>
                {t('saves.save')}
              </button>
              <button type="button" className="save-action" onClick={() => onLoad(key)}>
                {t('saves.load')}
              </button>
            </div>
          </div>
        )
      })}

      <div className="save-menu-row">
        <button type="button" className="save-action" onClick={onExport}>
          {t('saves.export')}
        </button>
        <button type="button" className="save-action" onClick={() => fileInputRef.current?.click()}>
          {t('saves.import')}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) onImport(file)
            event.target.value = ''
          }}
        />
      </div>

      <div className="save-menu-row">
        <button
          type="button"
          className="save-action save-action-danger"
          onClick={() => {
            if (window.confirm(t('saves.newGameConfirm'))) onNewGame()
          }}
        >
          {t('saves.newGame')}
        </button>
      </div>
    </div>
  )
}