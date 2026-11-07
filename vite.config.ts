import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
//
// Deploying on GitHub Pages later? Set `base` to the repository name, e.g.
// `base: '/common-ground/'` (see the development plan, Milestone 0 step 5).
export default defineConfig({
  plugins: [react()],
})
