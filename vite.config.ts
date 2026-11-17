import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { offline } from './scripts/offline-plugin.mjs'

// The config runs in Node; this is the only Node global it needs, declared
// here rather than adding @types/node for one line.
declare const process: { env: Record<string, string | undefined> }

// https://vite.dev/config/
//
// GitHub Pages serves the game from /<repository>/, so the deploy workflow
// sets BASE_PATH=/common-ground/. Locally (and on hosts that serve from the
// root) it stays '/'. Asset URLs in code use import.meta.env.BASE_URL.
//
// offline() writes the service worker (sw.js) that lets the game open with no
// connection after the first visit; see scripts/offline-plugin.mjs.
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [react(), offline()],
})
