import type { Plugin } from 'vite'

// Writes sw.js (the offline service worker) into the build.
export function offline(): Plugin
