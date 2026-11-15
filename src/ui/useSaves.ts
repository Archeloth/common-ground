import { useCallback, useEffect, useRef, useState } from 'react'
import type { GameStore } from '../game/store'
import type { GameState } from '../game/types'
import { openSaveDb } from '../persistence/db'
import type { SaveDb } from '../persistence/db'
import { createSave, parseAndLoad } from '../persistence/saveFile'
import { loadSlot, readSlotMeta, saveSlot, SLOT_KEYS } from '../persistence/slots'
import type { SlotMeta } from '../persistence/slots'
import { downloadSaveFile, readSaveFile } from '../persistence/fileTransfer'
import { t } from './i18n'

const AUTOSAVE_MS = 60_000 // plan: "autosave about once a minute"

// The game always opens paused - after a load or an import - so reading never
// costs the player progress (Milestone 8.5).
export function paused(state: GameState): GameState {
  return state.speed === 0 ? state : { ...state, speed: 0 }
}

export type SlotMetas = Record<string, SlotMeta | null>

export interface Saves {
  ready: boolean // the database is open and the slot list is known
  meta: SlotMetas
  // Whether a town is being played. Autosave only runs while this is true, so
  // sitting in the main menu can never overwrite the real autosave with the
  // blank town the store starts with.
  setSessionActive(active: boolean): void
  flushAutosave(): void
  load(key: string): Promise<boolean>
  save(key: string): Promise<void>
  exportCurrent(): void
  importFile(file: File): Promise<boolean>
}

// IndexedDB slots (autosave plus three manual ones) and .json export/import,
// moved out of App in Milestone 8.6 so the main menu and the in-game Save
// drawer share them. A broken save reports a friendly notice and never
// replaces the town (Milestone 5).
export function useSaves(store: GameStore, onNotice: (text: string) => void): Saves {
  const dbRef = useRef<SaveDb | null>(null)
  const lastAutoJsonRef = useRef<string | null>(null)
  const sessionRef = useRef(false)
  const [ready, setReady] = useState(false)
  const [meta, setMeta] = useState<SlotMetas>({ auto: null, s1: null, s2: null, s3: null })

  const refreshMeta = useCallback(async () => {
    const database = dbRef.current
    if (!database) return
    const next: SlotMetas = { auto: null, s1: null, s2: null, s3: null }
    for (const key of SLOT_KEYS) next[key] = await readSlotMeta(database, key)
    setMeta(next)
  }, [])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const database = await openSaveDb()
      if (cancelled) {
        database.close()
        return
      }
      dbRef.current = database
      await refreshMeta()
      setReady(true)
    })().catch(() => {
      setReady(true) // no storage: the menu still offers a new game
      onNotice(t('saves.loadFailed'))
    })
    return () => {
      cancelled = true
      dbRef.current?.close()
    }
  }, [refreshMeta, onNotice]) // both stable: the database opens once

  const flushAutosave = useCallback(() => {
    const database = dbRef.current
    if (!database || !sessionRef.current) return
    const json = JSON.stringify(store.getState())
    if (json === lastAutoJsonRef.current) return
    lastAutoJsonRef.current = json
    void saveSlot(database, 'auto', createSave(store.getState()))
      .then(refreshMeta)
      .catch(() => {
        lastAutoJsonRef.current = null // allow a retry next time
      })
  }, [store, refreshMeta])

  // Autosave roughly once a minute, plus a flush whenever the tab is hidden or
  // closed, so "close the tab and continue where you were" always holds.
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.hidden) flushAutosave()
    }
    const interval = window.setInterval(flushAutosave, AUTOSAVE_MS)
    window.addEventListener('pagehide', flushAutosave)
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      window.clearInterval(interval)
      window.removeEventListener('pagehide', flushAutosave)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [flushAutosave])

  const setSessionActive = useCallback((active: boolean) => {
    sessionRef.current = active
  }, [])

  const load = useCallback(
    async (key: string) => {
      const database = dbRef.current
      if (!database) return false
      const result = await loadSlot(database, key)
      if (result.save) {
        store.replaceState(paused(result.save.state))
        lastAutoJsonRef.current = null
        return true
      }
      onNotice(result.problems.length > 0 ? `${t('saves.loadFailed')} - ${result.problems[0]}` : t('saves.loadFailed'))
      return false
    },
    [store, onNotice],
  )

  const save = useCallback(
    async (key: string) => {
      const database = dbRef.current
      if (!database) return
      await saveSlot(database, key, createSave(store.getState()))
      onNotice(t('saves.savedOk'))
      await refreshMeta()
    },
    [store, onNotice, refreshMeta],
  )

  const exportCurrent = useCallback(() => {
    downloadSaveFile(createSave(store.getState()))
    onNotice(t('saves.exportOk'))
  }, [store, onNotice])

  const importFile = useCallback(
    async (file: File) => {
      try {
        const result = parseAndLoad(await readSaveFile(file))
        if (result.ok) {
          store.replaceState(paused(result.save.state))
          lastAutoJsonRef.current = null
          return true
        }
        onNotice(`${t('saves.loadFailed')} - ${result.problems[0] ?? ''}`)
      } catch {
        onNotice(t('saves.loadFailed'))
      }
      return false
    },
    [store, onNotice],
  )

  return { ready, meta, setSessionActive, flushAutosave, load, save, exportCurrent, importFile }
}
