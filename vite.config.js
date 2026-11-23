import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
// GitHub Pages serves this project site from https://<user>.github.io/NexuxPM/.
// Keeping the base path here makes Vite emit /NexuxPM/assets/... URLs in the
// production bundle while local development still works from http://localhost:5173.
export default defineConfig({
  base: '/NexuxPM/',
  plugins: [react()],
})
