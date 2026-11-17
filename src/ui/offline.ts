import { useSyncExternalStore } from 'react'

// Offline play (post-Milestone 9): registers the service worker that the
// build writes (scripts/offline-plugin.mjs), and notices when a newer version
// of the game has been downloaded. The update is never forced mid-game: the
// main menu offers a reload, and only when the player chooses it does the new
// worker take over.

let waiting: ServiceWorker | null = null
const listeners = new Set<() => void>()

function setWaiting(worker: ServiceWorker | null): void {
  waiting = worker
  for (const listener of listeners) listener()
}

export function registerServiceWorker(): void {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`)
      .then((registration) => {
        // A worker already waiting from an earlier visit.
        if (registration.waiting && navigator.serviceWorker.controller) setWaiting(registration.waiting)
        registration.addEventListener('updatefound', () => {
          const incoming = registration.installing
          incoming?.addEventListener('statechange', () => {
            // Installed while an older version runs the page: an update.
            if (incoming.state === 'installed' && navigator.serviceWorker.controller) setWaiting(incoming)
          })
        })
      })
      .catch(() => {
        // No offline support (private mode, file://): the game still runs online.
      })
  })
}

export function applyUpdate(): void {
  if (!waiting) return
  navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload(), { once: true })
  waiting.postMessage('skipWaiting')
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function useUpdateReady(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => waiting !== null,
    () => false,
  )
}
