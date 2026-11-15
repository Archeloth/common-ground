import type { SaveFile } from './saveFile'

// Export/import of a save as a .json file — the player's safety net, since the
// game has no server. Only the shell is browser-bound: the harder parts
// (parse + validate + migrate) live in saveFile.ts and are unit-tested.

export const SAVE_FILENAME = 'common-ground-save.json'

export function downloadSaveFile(save: SaveFile, filename = SAVE_FILENAME): void {
  const blob = new Blob([JSON.stringify(save, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  // Revoking synchronously can cancel the download in some browsers; give
  // the click a moment to start it first.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function readSaveFile(file: File): Promise<string> {
  return file.text()
}